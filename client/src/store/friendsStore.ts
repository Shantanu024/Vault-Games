import { create } from 'zustand';
import api from '../config/api';

export interface Friend {
  friendshipId: string;
  friend: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isOnline: boolean;
    lastSeen?: string;
  };
}

export interface FriendRequest {
  id: string;
  status: 'PENDING';
  createdAt: string;
  requester?: { id: string; username: string; displayName?: string; avatarUrl?: string };
  addressee?: { id: string; username: string; displayName?: string; avatarUrl?: string };
}

interface FriendsState {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  isLoading: boolean;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  cancelRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  setOnlineStatus: (userId: string, isOnline: boolean) => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  isLoading: false,

  fetchFriends: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/friends');
      set({ friends: res.data.friends });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRequests: async () => {
    try {
      const res = await api.get('/friends/requests');
      set({ incoming: res.data.incoming, outgoing: res.data.outgoing });
    } catch {}
  },

  sendRequest: async (userId) => {
    await api.post(`/friends/request/${userId}`);
    await get().fetchRequests();
  },

  acceptRequest: async (friendshipId) => {
    await api.patch(`/friends/accept/${friendshipId}`);
    await Promise.all([get().fetchFriends(), get().fetchRequests()]);
  },

  cancelRequest: async (friendshipId) => {
    await api.delete(`/friends/request/${friendshipId}`);
    await get().fetchRequests();
  },

  removeFriend: async (friendshipId) => {
    await api.delete(`/friends/${friendshipId}`);
    set((s) => ({ friends: s.friends.filter((f) => f.friendshipId !== friendshipId) }));
  },

  setOnlineStatus: (userId, isOnline) => {
    set((s) => ({
      friends: s.friends.map((f) =>
        f.friend.id === userId
          ? { ...f, friend: { ...f.friend, isOnline } }
          : f
      ),
    }));
  },
}));
