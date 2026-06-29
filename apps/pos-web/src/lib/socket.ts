import { io, type Socket } from 'socket.io-client';
import { useEffect } from 'react';
import { getSocketUrl } from './config';

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// Subscribe to a socket event for the lifetime of a component.
export function useSocketEvent(event: string, handler: (payload: unknown) => void): void {
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}

// Tell the server which extra rooms this client wants to join.
export function joinRoom(event: 'join.kitchen' | 'join.admin-dashboard'): void {
  getSocket()?.emit(event);
}
