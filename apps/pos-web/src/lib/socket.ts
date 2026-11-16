import { useEffect, useRef } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Socket } from 'socket.io-client';
import { api } from './axios';
import { getSocketUrl } from './config';
import { tokenStorage } from './tokenStorage';

// Live updates arrive over one of two transports, both feeding the same local
// event bus: Supabase Realtime when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
// are set (serverless deploy), otherwise Socket.IO to the Nest backend.

type Handler = (payload: unknown) => void;
type ExtraRoom = 'kitchen' | 'admin-dashboard';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const handlers = new Map<string, Set<Handler>>();
const extraRooms = new Set<ExtraRoom>();

function dispatch(event: string, payload: unknown): void {
  handlers.get(event)?.forEach((h) => {
    try {
      h(payload);
    } catch (err) {
      console.warn(`[realtime] handler for "${event}" failed`, err);
    }
  });
}

interface Transport {
  join(room: ExtraRoom): void;
  close(): void;
}

// Bumped on every connect/disconnect so an in-flight connect can tell it was superseded.
let generation = 0;
let transport: Transport | null = null;
let connecting = false;

export function connectRealtime(): void {
  if (transport || connecting) return;
  connecting = true;
  const gen = ++generation;
  const open = useSupabase ? openSupabase : openSocketIo;
  open()
    .then((t) => {
      if (gen !== generation) {
        t.close();
        return;
      }
      transport = t;
    })
    .catch((err) => console.warn('[realtime] connect failed', err))
    .finally(() => {
      if (gen === generation) connecting = false;
    });
}

export function disconnectRealtime(): void {
  generation++;
  connecting = false;
  extraRooms.clear();
  transport?.close();
  transport = null;
}

// Ask for an extra room (kitchen / admin dashboard). Remembered and rejoined on reconnect.
export function joinRoom(event: 'join.kitchen' | 'join.admin-dashboard'): void {
  const room = event.slice('join.'.length) as ExtraRoom;
  extraRooms.add(room);
  transport?.join(room);
}

// Subscribe to a realtime event for the lifetime of a component.
export function useSocketEvent(event: string, handler: Handler): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    const h: Handler = (payload) => ref.current(payload);
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    set.add(h);
    return () => {
      set.delete(h);
    };
  }, [event]);
}

async function openSocketIo(): Promise<Transport> {
  const { io } = await import('socket.io-client');
  const socket: Socket = io(getSocketUrl(), {
    // Read the token on every (re)connect so a refreshed access token is used.
    auth: (cb) => cb({ token: tokenStorage.getAccess() }),
    transports: ['websocket'],
  });
  socket.onAny((event: string, payload: unknown) => dispatch(event, payload));
  socket.on('connect', () => extraRooms.forEach((room) => socket.emit(`join.${room}`)));
  socket.on('connect_error', (err) => console.warn('[realtime] socket error', err.message));
  return {
    join: (room) => {
      if (socket.connected) socket.emit(`join.${room}`);
    },
    close: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}

interface RealtimeToken {
  token: string;
  restaurantId: string;
  expiresIn: number;
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

async function openSupabase(): Promise<Transport> {
  // The callback runs on connect and on every heartbeat (~25s), so cache the token.
  let cached: { token: string; expiresAt: number } | null = null;
  let inflight: Promise<RealtimeToken> | null = null;

  const fetchToken = (): Promise<RealtimeToken> => {
    inflight ??= api
      .get<RealtimeToken>('/realtime/token')
      .then(({ data }) => {
        cached = { token: data.token, expiresAt: Date.now() + data.expiresIn * 1000 };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const getToken = async (): Promise<string | null> => {
    if (cached && cached.expiresAt - Date.now() > REFRESH_MARGIN_MS) return cached.token;
    try {
      return (await fetchToken()).token;
    } catch (err) {
      console.warn('[realtime] token refresh failed', err);
      return cached?.token ?? null;
    }
  };

  const { restaurantId } = await fetchToken();
  const { createClient } = await import('@supabase/supabase-js');
  const client: SupabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    accessToken: getToken,
  });
  await client.realtime.setAuth();

  const channels = new Map<string, RealtimeChannel>();
  const subscribe = (topic: string): void => {
    if (channels.has(topic)) return;
    const channel = client
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: '*' }, (msg) => dispatch(msg.event, msg.payload))
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[realtime] ${topic}: ${status}`, err);
        }
      });
    channels.set(topic, channel);
  };

  subscribe(`restaurant:${restaurantId}`);
  extraRooms.forEach((room) => subscribe(`${room}:${restaurantId}`));

  return {
    join: (room) => subscribe(`${room}:${restaurantId}`),
    close: () => {
      channels.clear();
      void client.removeAllChannels();
    },
  };
}
