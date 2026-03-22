import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Users, Gamepad2, Trophy, LogOut,
  Coins, Circle, Settings, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useFriendsStore } from '../../store/friendsStore';
import Avatar from '../ui/Avatar';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, closeSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const { friends, incoming, fetchFriends, fetchRequests } = useFriendsStore();

  useEffect(() => {
    if (sidebarOpen && user) {
      fetchFriends();
      fetchRequests();
    }
  }, [sidebarOpen]);

  const navItems = [
    { icon: Gamepad2, label: 'Game Lobby', path: '/' },
    { icon: Users, label: 'Friends', path: '/friends', badge: incoming.length || undefined },
    { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  ];

  const onlineFriends = friends.filter((f) => f.friend.isOnline);

  const handleNav = (path: string) => {
    navigate(path);
    closeSidebar();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closeSidebar}
          />

          {/* Sidebar panel */}
          <motion.aside
            key="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-vault-bg-surface border-r border-vault-border z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-vault-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-vault-violet flex items-center justify-center">
                  <span className="text-white text-xs font-display font-bold">V</span>
                </div>
                <span className="font-display font-semibold text-vault-text-primary">VaultGames</span>
              </div>
              <button
                onClick={closeSidebar}
                className="w-7 h-7 rounded-lg bg-vault-bg-elevated hover:bg-vault-border flex items-center justify-center text-vault-text-muted hover:text-vault-text-primary transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Profile section */}
            <button
              onClick={() => handleNav(`/profile/${user?.username}`)}
              className="flex items-center gap-3 p-4 hover:bg-vault-bg-elevated transition-colors group border-b border-vault-border"
            >
              <div className="relative">
                <Avatar
                  src={user?.avatarUrl}
                  username={user?.username || '?'}
                  size={44}
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-vault-success border-2 border-vault-bg-surface" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold text-sm text-vault-text-primary truncate">
                  {user?.displayName || user?.username}
                </div>
                <div className="text-xs text-vault-text-muted truncate">@{user?.username}</div>
              </div>
              <ChevronRight size={14} className="text-vault-text-muted group-hover:text-vault-glow transition-colors" />
            </button>

            {/* Coins badge */}
            <div className="mx-4 mt-3 flex items-center gap-2 bg-vault-bg-elevated rounded-xl px-3 py-2 border border-vault-border">
              <Coins size={14} className="text-vault-gold" />
              <span className="text-sm font-mono font-semibold text-vault-gold">
                {(user?.coins || 0).toLocaleString()}
              </span>
              <span className="text-xs text-vault-text-muted ml-auto">coins</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <p className="text-xs font-medium text-vault-text-muted uppercase tracking-wider mb-3 px-2">
                Navigation
              </p>
              {navItems.map(({ icon: Icon, label, path, badge }) => {
                const isActive = location.pathname === path.split('?')[0];
                return (
                  <button
                    key={path}
                    onClick={() => handleNav(path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-vault-violet/20 text-vault-glow border border-vault-violet/30'
                        : 'text-vault-text-secondary hover:bg-vault-bg-elevated hover:text-vault-text-primary'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{label}</span>
                    {badge ? (
                      <span className="bg-vault-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {/* Online Friends */}
              {onlineFriends.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-medium text-vault-text-muted uppercase tracking-wider mb-3 px-2">
                    Online Friends ({onlineFriends.length})
                  </p>
                  <div className="space-y-1">
                    {onlineFriends.slice(0, 8).map(({ friend, friendshipId }) => (
                      <button
                        key={friendshipId}
                        onClick={() => handleNav(`/profile/${friend.username}`)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-vault-bg-elevated transition-colors group"
                      >
                        <div className="relative">
                          <Avatar src={friend.avatarUrl} username={friend.username} size={28} />
                          <Circle
                            size={8}
                            className="absolute -bottom-0.5 -right-0.5 text-vault-success fill-vault-success"
                          />
                        </div>
                        <span className="text-sm text-vault-text-secondary group-hover:text-vault-text-primary transition-colors truncate">
                          {friend.displayName || friend.username}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Footer actions */}
            <div className="p-4 border-t border-vault-border space-y-1">
              <button
                onClick={() => handleNav(`/profile/${user?.username}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-vault-text-secondary hover:bg-vault-bg-elevated hover:text-vault-text-primary transition-colors"
              >
                <Settings size={16} />
                Settings & Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-vault-danger hover:bg-vault-danger/10 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
