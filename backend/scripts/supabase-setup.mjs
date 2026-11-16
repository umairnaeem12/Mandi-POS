// One-time Supabase setup: create the tables, apply the security SQL, check Realtime.
// Reads backend/.env.supabase.local, or another file in backend/ given as the first
// argument, with the same parser Prisma uses. Safe to re-run. Prints no secrets.
// Usage, from the repo root:  node backend/scripts/supabase-setup.mjs [env-file]
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(backendDir, process.argv[2] ?? '.env.supabase.local');

if (!existsSync(envFile)) {
  console.error(`Missing ${envFile}`);
  process.exit(1);
}
const vars = dotenv.parse(readFileSync(envFile));

const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SECRET_KEY', 'DIRECT_URL'].filter(
  (k) => !vars[k]?.trim(),
);
if (missing.length) {
  console.error(`Empty or missing in ${process.argv[2] ?? '.env.supabase.local'}: ${missing.join(', ')}`);
  process.exit(1);
}

// Describe what is wrong with a connection string without echoing it.
function checkDbUrl(name, value, expectedPort) {
  const problems = [];
  const v = value.trim();
  if (v !== value) problems.push('has spaces at the start or end');
  if (/^["'“”‘’]/.test(v)) problems.push('starts with a quote character (remove the quotes, or use plain " quotes)');
  if (v.includes('[YOUR-PASSWORD]')) problems.push('still contains [YOUR-PASSWORD]: put your database password there');
  const scheme = v.split('://')[0];
  if (!/^postgres(ql)?$/.test(scheme)) {
    problems.push(
      v.includes('://')
        ? `starts with "${scheme.slice(0, 15)}://" instead of "postgresql://"`
        : 'is not a connection string (no "://"); copy the whole line from Connect → ORM → Prisma',
    );
  } else if ((v.match(/@/g) ?? []).length > 1 || /[#\s]/.test(v)) {
    problems.push(
      'the password contains a special character (@ # or a space) that must be URL-encoded; easiest is to reset the DB password to letters and digits only',
    );
  } else {
    try {
      const u = new URL(v);
      if (!u.port) {
        problems.push(
          'looks cut short. If the password has a # in it, the .env file treats the rest as a comment: wrap the whole value in double quotes',
        );
      } else if (expectedPort && u.port !== String(expectedPort)) {
        problems.push(`uses port ${u.port || '(none)'}; expected ${expectedPort}`);
      }
      if (!u.hostname.endsWith('supabase.com') && !u.hostname.endsWith('supabase.co')) {
        problems.push('does not point at a Supabase host');
      }
    } catch {
      problems.push(
        'cannot be parsed: the password probably contains @ # / ? & or %, which must be URL-encoded (or reset the DB password to letters and digits)',
      );
    }
  }
  console.log(problems.length ? `FAIL  ${name} ${problems.join('; ')}` : `ok    ${name}`);
  return problems.length === 0;
}

if (!checkDbUrl('DIRECT_URL', vars.DIRECT_URL, 5432)) process.exit(1);
// Setup only needs DIRECT_URL; DATABASE_URL matters for the deployed app, so just warn.
if (vars.DATABASE_URL?.includes('supabase') && !checkDbUrl('DATABASE_URL', vars.DATABASE_URL, 6543)) {
  console.log('      (warning only: fix DATABASE_URL before deploying to Vercel)');
}

const env = { ...process.env, ...vars, DATABASE_URL: vars.DIRECT_URL.trim() };
const run = (label, cmd, args) => {
  console.log(`\n${label}`);
  const r = spawnSync(cmd, args, { cwd: backendDir, env, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nStopped at: ${label}`);
    process.exit(r.status ?? 1);
  }
};

run('1/3  Creating the tables (prisma migrate deploy)', 'npx', ['prisma', 'migrate', 'deploy']);
run('2/3  Applying Supabase security SQL', 'psql', [
  env.DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-q',
  '-f', 'supabase/realtime-policies.sql',
  '-f', 'supabase/lock-down-data-api.sql',
]);
run('3/3  Checking Realtime', 'node', ['scripts/check-supabase-realtime.mjs']);
