import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@edugesture/shared-types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(token?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    socket = io(serverUrl, {
      auth: { token: token || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  } else if (token) {
    socket.auth = { token };
  }

  return socket;
}
