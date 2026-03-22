import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocketStore } from '../store/socketStore';
import { useFriendsStore } from '../store/friendsStore';
import { useAuthStore } from '../store/authStore';

/**
 * Mount once at the app root to wire up global socket events:
 * - friend presence (online/offline)
 * - incoming friend requests
 * - friend request accepted
 */
export function useGlobalSocketEvents() {
  const { socket } = useSocketStore();
  const { setOnlineStatus, fetchRequests, fetchFriends } = useFriendsStore();
  const { setUser, user } = useAuthStore();

  useEffect(() => {
    if (!socket) return;

    // Friend went online/offline
    socket.on('friend:presence', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineStatus(userId, isOnline);
    });

    // Someone sent me a friend request
    socket.on('friend:request', ({ from }: { friendshipId: string; from: any }) => {
      toast(`${from.username} sent you a friend request`, { icon: '👋' });
      fetchRequests();
    });

    // My friend request was accepted
    socket.on('friend:accepted', ({ friend }: { friendshipId: string; friend: any }) => {
      toast.success(`${friend.username} accepted your friend request!`);
      fetchFriends();
      fetchRequests();
    });

    // A friend removed me
    socket.on('friend:removed', () => {
      fetchFriends();
    });

    // Server awarded coins (e.g. after a game win)
    socket.on('coins:awarded', ({ amount, reason }: { amount: number; reason: string }) => {
      if (user) {
        setUser({ coins: (user.coins || 0) + amount });
        toast.success(`+${amount} coins — ${reason}`, { icon: '🪙', duration: 4000 });
      }
    });

    return () => {
      socket.off('friend:presence');
      socket.off('friend:request');
      socket.off('friend:accepted');
      socket.off('friend:removed');
      socket.off('coins:awarded');
    };
  }, [socket]);
}
