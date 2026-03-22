import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserPlus, Check, X, UserMinus, Users,
  Circle, Clock, Loader2, Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import Avatar from '../components/ui/Avatar';
import { useFriendsStore } from '../store/friendsStore';
import api from '../config/api';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    friends, incoming, outgoing,
    fetchFriends, fetchRequests,
    acceptRequest, cancelRequest, removeFriend, sendRequest,
  } = useFriendsStore();

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.users);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (userId: string, username: string) => {
    setActionLoading(userId);
    try {
      await sendRequest(userId);
      toast.success(`Friend request sent to ${username}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await acceptRequest(friendshipId);
      toast.success('Friend request accepted!');
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await cancelRequest(friendshipId);
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (friendshipId: string, username: string) => {
    if (!confirm(`Remove ${username} from friends?`)) return;
    setActionLoading(friendshipId);
    try {
      await removeFriend(friendshipId);
      toast.success('Friend removed');
    } catch {
      toast.error('Failed to remove friend');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = incoming.length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-2xl font-bold text-vault-text-primary mb-1">
            Friends
          </h1>
          <p className="text-sm text-vault-text-muted">
            {friends.length} friends · {friends.filter((f) => f.friend.isOnline).length} online
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-vault-bg-surface border border-vault-border rounded-xl p-1 mb-6">
          {([
            { key: 'friends', label: 'Friends', icon: Users },
            { key: 'requests', label: `Requests${pendingCount ? ` (${pendingCount})` : ''}`, icon: Inbox },
            { key: 'search', label: 'Find Players', icon: Search },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-vault-violet/20 text-vault-glow border border-vault-violet/30'
                  : 'text-vault-text-muted hover:text-vault-text-secondary'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:block">{label}</span>
              {key === 'requests' && pendingCount > 0 && (
                <span className="sm:hidden bg-vault-danger text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── FRIENDS LIST ── */}
          {tab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {friends.length === 0 ? (
                <EmptyState
                  icon={<Users size={32} className="text-vault-text-muted" />}
                  title="No friends yet"
                  description="Search for players and send friend requests to get started."
                  action={{ label: 'Find Players', onClick: () => setTab('search') }}
                />
              ) : (
                friends.map(({ friend, friendshipId }) => (
                  <motion.div
                    key={friendshipId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-vault-bg-surface border border-vault-border rounded-xl p-3 hover:border-vault-border-light transition-colors group"
                  >
                    <div className="relative">
                      <Avatar src={friend.avatarUrl} username={friend.username} size={40} />
                      <Circle
                        size={10}
                        className={`absolute -bottom-0.5 -right-0.5 ${
                          friend.isOnline
                            ? 'text-vault-success fill-vault-success'
                            : 'text-vault-text-muted fill-vault-text-muted'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-vault-text-primary truncate">
                        {friend.displayName || friend.username}
                      </p>
                      <p className="text-xs text-vault-text-muted">
                        {friend.isOnline ? (
                          <span className="text-vault-success">Online</span>
                        ) : (
                          <span>Last seen {timeAgo(friend.lastSeen)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(friendshipId, friend.username)}
                      disabled={actionLoading === friendshipId}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-vault-danger/10 hover:bg-vault-danger/20 text-vault-danger flex items-center justify-center transition-all"
                      title="Remove friend"
                    >
                      {actionLoading === friendshipId
                        ? <Loader2 size={13} className="animate-spin" />
                        : <UserMinus size={13} />
                      }
                    </button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ── REQUESTS ── */}
          {tab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Incoming */}
              <div>
                <h3 className="text-xs font-medium text-vault-text-muted uppercase tracking-wider mb-3">
                  Incoming ({incoming.length})
                </h3>
                {incoming.length === 0 ? (
                  <p className="text-sm text-vault-text-muted text-center py-4">No pending requests</p>
                ) : (
                  <div className="space-y-2">
                    {incoming.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 bg-vault-bg-surface border border-vault-border rounded-xl p-3"
                      >
                        <Avatar src={req.requester?.avatarUrl} username={req.requester?.username || '?'} size={38} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-vault-text-primary">
                            {req.requester?.displayName || req.requester?.username}
                          </p>
                          <p className="text-xs text-vault-text-muted">@{req.requester?.username}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(req.id)}
                            disabled={actionLoading === req.id}
                            className="w-8 h-8 rounded-lg bg-vault-success/20 hover:bg-vault-success/30 text-vault-success flex items-center justify-center transition-colors"
                            title="Accept"
                          >
                            {actionLoading === req.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={actionLoading === req.id}
                            className="w-8 h-8 rounded-lg bg-vault-danger/10 hover:bg-vault-danger/20 text-vault-danger flex items-center justify-center transition-colors"
                            title="Decline"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing */}
              <div>
                <h3 className="text-xs font-medium text-vault-text-muted uppercase tracking-wider mb-3">
                  Sent ({outgoing.length})
                </h3>
                {outgoing.length === 0 ? (
                  <p className="text-sm text-vault-text-muted text-center py-4">No sent requests</p>
                ) : (
                  <div className="space-y-2">
                    {outgoing.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 bg-vault-bg-surface border border-vault-border rounded-xl p-3"
                      >
                        <Avatar src={req.addressee?.avatarUrl} username={req.addressee?.username || '?'} size={38} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-vault-text-primary">
                            {req.addressee?.displayName || req.addressee?.username}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-vault-warning">
                            <Clock size={11} />
                            Pending
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancel(req.id)}
                          disabled={actionLoading === req.id}
                          className="text-xs text-vault-text-muted hover:text-vault-danger transition-colors px-2 py-1 rounded-lg hover:bg-vault-danger/10"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SEARCH ── */}
          {tab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by username…"
                  className="w-full bg-vault-bg-surface border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                  autoFocus
                />
                {searchLoading && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-text-muted animate-spin" />
                )}
              </div>

              {searchQuery.length < 2 ? (
                <p className="text-center text-sm text-vault-text-muted py-8">
                  Type at least 2 characters to search
                </p>
              ) : searchResults.length === 0 && !searchLoading ? (
                <p className="text-center text-sm text-vault-text-muted py-8">
                  No players found for "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((u) => {
                    const alreadyFriend = friends.some((f) => f.friend.id === u.id);
                    const alreadySent = outgoing.some((r) => r.addressee?.id === u.id);
                    const pendingIncoming = incoming.some((r) => r.requester?.id === u.id);

                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 bg-vault-bg-surface border border-vault-border rounded-xl p-3"
                      >
                        <div className="relative">
                          <Avatar src={u.avatarUrl} username={u.username} size={40} />
                          {u.isOnline && (
                            <Circle size={10} className="absolute -bottom-0.5 -right-0.5 text-vault-success fill-vault-success" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-vault-text-primary">
                            {u.displayName || u.username}
                          </p>
                          <p className="text-xs text-vault-text-muted">@{u.username}</p>
                        </div>
                        {alreadyFriend ? (
                          <span className="text-xs text-vault-success bg-vault-success/10 border border-vault-success/20 px-2 py-1 rounded-lg">
                            Friends
                          </span>
                        ) : alreadySent ? (
                          <span className="text-xs text-vault-warning bg-vault-warning/10 border border-vault-warning/20 px-2 py-1 rounded-lg">
                            Sent
                          </span>
                        ) : pendingIncoming ? (
                          <button
                            onClick={() => {
                              const req = incoming.find((r) => r.requester?.id === u.id);
                              if (req) handleAccept(req.id);
                            }}
                            className="text-xs text-vault-success bg-vault-success/10 hover:bg-vault-success/20 border border-vault-success/20 px-2 py-1 rounded-lg transition-colors"
                          >
                            Accept
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(u.id, u.username)}
                            disabled={actionLoading === u.id}
                            className="flex items-center gap-1.5 text-xs bg-vault-violet/20 hover:bg-vault-violet/30 text-vault-glow border border-vault-violet/30 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {actionLoading === u.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <UserPlus size={11} />
                            }
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-semibold text-vault-text-secondary mb-1">{title}</h3>
      <p className="text-sm text-vault-text-muted mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-vault-violet hover:text-vault-glow transition-colors"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'a while ago';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
