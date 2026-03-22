import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      set({ isConnected: false });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
