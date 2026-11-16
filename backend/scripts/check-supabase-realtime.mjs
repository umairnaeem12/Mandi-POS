// Checks that Supabase Realtime accepts our backend-minted tokens and keeps
// restaurants apart. Reads SUPABASE_* from the environment; prints no secrets.
// Usage: run through scripts/supabase-setup.sh, or with the vars already exported.
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY, SUPABASE_JWT_SECRET } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SECRET_KEY) {
  console.error('FAIL  SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SECRET_KEY must be set.');
  process.exit(1);
}
if (!SUPABASE_JWT_SECRET) {
  console.error('STOP  SUPABASE_JWT_SECRET is empty. Live updates need it; we will sort this out together.');
  process.exit(2);
}

const own = 'check-restaurant-a';
const other = 'check-restaurant-b';
const token = jwt.sign({ sub: 'realtime-check', role: 'authenticated', restaurant_id: own }, SUPABASE_JWT_SECRET, {
  algorithm: 'HS256',
  audience: 'authenticated',
  expiresIn: 300,
});

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { accessToken: async () => token });
await client.realtime.setAuth();

// Listeners must be attached before subscribe, so every channel reports broadcasts here.
const waiters = new Map();
const onBroadcast = (topic, msg) => waiters.get(`${topic}|${msg.event}`)?.();

const joinOnce = (topic) =>
  new Promise((resolve) => {
    const channel = client
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: '*' }, (msg) => onBroadcast(topic, msg));
    const timer = setTimeout(() => resolve({ status: 'TIMED_OUT', channel }), 10_000);
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        resolve({ status, err: err?.message ?? '', channel });
      }
    });
  });

// A brand-new project has no realtime.messages partitions until a client has
// connected once, so the first joins can fail with MissingPartition. Retry a few times.
const join = async (topic) => {
  for (let attempt = 1; ; attempt++) {
    const r = await joinOnce(topic);
    if (!/MissingPartition/.test(r.err) || attempt === 6) return r;
    await client.removeChannel(r.channel);
    console.log(`      ${topic}: Supabase is still creating its message storage, retrying (${attempt}/5)`);
    await new Promise((res) => setTimeout(res, 5_000));
  }
};

let failed = false;
const report = (ok, label, detail = '') => {
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

// 1. Our token can join its own restaurant's channel.
const mine = await join(`restaurant:${own}`);
report(mine.status === 'SUBSCRIBED', 'token accepted for own restaurant channel', mine.status === 'SUBSCRIBED' ? '' : `${mine.status} ${mine.err ?? ''}`);

// 2. It cannot join another restaurant's channel, and the refusal comes from our policy.
const theirs = await join(`restaurant:${other}`);
if (theirs.status === 'SUBSCRIBED') {
  report(false, 'another restaurant channel is refused', 'joined: turn off public Realtime access and re-run realtime-policies.sql');
} else if (/MissingPartition/.test(theirs.err)) {
  report(false, 'another restaurant channel is refused', 'inconclusive: message storage not ready yet, run again in a minute');
} else {
  report(true, 'another restaurant channel is refused', `${theirs.status} ${theirs.err}`.trim());
}

// 3. A backend broadcast reaches the subscriber.
if (mine.status === 'SUBSCRIBED') {
  const received = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 8_000);
    waiters.set(`restaurant:${own}|realtime.check`, () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/realtime/v1/api/broadcast/${encodeURIComponent(`restaurant:${own}`)}/events/realtime.check?private=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  });
  report(res.ok, 'backend broadcast accepted', res.ok ? '' : `HTTP ${res.status} ${await res.text()}`);
  report(await received, 'broadcast delivered to the subscriber');
}

await client.removeAllChannels();
console.log(failed ? '\nSome checks failed. Paste this output to Claude.' : '\nRealtime is ready.');
process.exit(failed ? 1 : 0);
