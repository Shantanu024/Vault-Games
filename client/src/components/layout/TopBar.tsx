import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Coins } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useFriendsStore } from '../../store/friendsStore';
import Avatar from '../ui/Avatar';

export default function TopBar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { incoming } = useFriendsStore();

  return (
    <header className="h-14 border-b border-vault-border bg-vault-bg-surface/80 backdrop-blur-md flex items-center px-4 gap-3 sticky top-0 z-30">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 rounded-xl bg-vault-bg-elevated hover:bg-vault-border flex items-center justify-center text-vault-text-secondary hover:text-vault-text-primary transition-colors relative"
        aria-label="Open menu"
      >
        <Menu size={18} />
        {incoming.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-vault-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {incoming.length}
          </span>
        )}
      </button>

      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 mr-auto"
      >
        <div className="w-7 h-7 rounded-lg bg-vault-violet flex items-center justify-center">
          <span className="text-white text-xs font-display font-bold">V</span>
        </div>
        <span className="font-display font-semibold text-vault-text-primary hidden sm:block">
          VaultGames
        </span>
      </button>

      {/* Coins */}
      <div className="flex items-center gap-1.5 bg-vault-bg-elevated border border-vault-border rounded-xl px-3 py-1.5">
        <Coins size={13} className="text-vault-gold" />
        <span className="text-sm font-mono font-semibold text-vault-gold">
          {(user?.coins || 0).toLocaleString()}
        </span>
      </div>

      {/* Notifications */}
      <button
        onClick={() => navigate('/friends')}
        className="w-9 h-9 rounded-xl bg-vault-bg-elevated hover:bg-vault-border flex items-center justify-center text-vault-text-secondary hover:text-vault-text-primary transition-colors relative"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {incoming.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-vault-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {incoming.length}
          </span>
        )}
      </button>

      {/* Avatar */}
      <button
        onClick={() => navigate(`/profile/${user?.username}`)}
        className="rounded-full ring-2 ring-transparent hover:ring-vault-violet transition-all"
      >
        <Avatar src={user?.avatarUrl} username={user?.username || '?'} size={34} />
      </button>
    </header>
  );
}
