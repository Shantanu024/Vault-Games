import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, User, Globe, FileText, Camera, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import api from '../../config/api';

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Japan', 'Brazil', 'South Korea',
  'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Spain',
  'Italy', 'Portugal', 'Poland', 'Ukraine', 'Russia',
  'China', 'Singapore', 'Malaysia', 'Indonesia', 'Pakistan',
  'Bangladesh', 'Sri Lanka', 'Nepal', 'Other',
];

export default function ProfileCompletionModal() {
  const { user, setUser } = useAuthStore();
  const { profileCompletionOpen, setProfileCompletionOpen } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (user && !user.isProfileComplete) {
      setProfileCompletionOpen(true);
      setDisplayName(user.displayName || user.username);
    }
  }, [user?.isProfileComplete]);

  if (!profileCompletionOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', { displayName, bio, country });
      setUser(res.data.user);
      setProfileCompletionOpen(false);
      toast.success('Profile updated! Welcome to VaultGames 🎮');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md glass rounded-2xl shadow-card overflow-hidden"
        >
          {/* Header */}
          <div className="bg-vault-violet/10 border-b border-vault-border p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-vault-violet/20 border border-vault-violet/40 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} className="text-vault-glow" />
            </div>
            <h2 className="font-display text-xl font-bold text-vault-text-primary">
              Complete Your Profile
            </h2>
            <p className="text-sm text-vault-text-secondary mt-1">
              Help other players find and recognize you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                Display Name
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={30}
                  placeholder="How should others see your name?"
                  className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                Country
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet transition-colors appearance-none"
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c} className="bg-vault-bg-surface">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5 uppercase tracking-wider">
                Bio <span className="normal-case text-vault-text-muted">(optional)</span>
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-3 text-vault-text-muted" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="Tell other players about yourself…"
                  className="w-full bg-vault-bg-deep border border-vault-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors resize-none"
                />
                <span className="absolute bottom-2 right-3 text-xs text-vault-text-muted">
                  {bio.length}/160
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProfileCompletionOpen(false)}
                className="flex-1 border border-vault-border text-vault-text-secondary hover:text-vault-text-primary hover:border-vault-border-light rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-vault-violet hover:bg-vault-violet-light disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-glow-sm"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                {loading ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
