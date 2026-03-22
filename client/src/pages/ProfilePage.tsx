import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera, Edit3, Save, X, Globe, FileText, User,
  Coins, Trophy, Gamepad2, Users, ArrowLeft, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Avatar from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import api from '../config/api';

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const isOwnProfile = !username || username === user?.username;
  const targetUsername = username || user?.username;

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['profile', targetUsername],
    queryFn: () => api.get(`/users/${targetUsername}`).then((r) => r.data.user),
    enabled: !!targetUsername,
  });

  useEffect(() => {
    if (data && isOwnProfile) {
      setDisplayName(data.displayName || data.username);
      setBio(data.bio || '');
      setCountry(data.country || '');
    }
  }, [data, isOwnProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', { displayName, bio, country });
      setUser(res.data.user);
      setEditing(false);
      refetch();
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ avatarUrl: res.data.avatarUrl });
      refetch();
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={28} className="animate-spin text-vault-text-muted" />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-vault-text-muted">User not found</p>
          <button onClick={() => navigate('/')} className="mt-4 text-vault-violet hover:text-vault-glow text-sm">
            Go Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!isOwnProfile && (
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-vault-text-muted hover:text-vault-text-primary mb-6 transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
        )}

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-vault-bg-surface border border-vault-border rounded-2xl overflow-hidden mb-6"
        >
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-vault-violet/30 via-vault-blue/20 to-vault-violet/10" />

          {/* Avatar + info */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                <div className="ring-4 ring-vault-bg-surface rounded-full">
                  <Avatar
                    src={isOwnProfile ? user?.avatarUrl : data.avatarUrl}
                    username={data.username}
                    size={72}
                  />
                </div>
                {isOwnProfile && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-vault-violet border-2 border-vault-bg-surface flex items-center justify-center text-white hover:bg-vault-violet-light transition-colors"
                    >
                      {uploadingAvatar ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {isOwnProfile && (
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-vault-border text-vault-text-muted hover:text-vault-text-primary text-sm transition-colors">
                        <X size={13} /> Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-violet hover:bg-vault-violet-light text-white text-sm font-medium transition-all shadow-glow-sm">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-vault-border text-vault-text-secondary hover:text-vault-text-primary hover:border-vault-border-light text-sm transition-colors">
                      <Edit3 size={13} /> Edit Profile
                    </button>
                  )}
                </div>
              )}
            </div>

            {editing && isOwnProfile ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1 uppercase tracking-wider">Display Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                    className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet"
                  />
                </div>
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1 uppercase tracking-wider">Country</label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    maxLength={50}
                    placeholder="Your country"
                    className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet"
                  />
                </div>
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1 uppercase tracking-wider">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary resize-none focus:outline-none focus:border-vault-violet"
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-vault-text-primary">
                  {data.displayName || data.username}
                </h1>
                <p className="text-sm text-vault-text-muted mb-2">@{data.username}</p>
                {data.bio && (
                  <p className="text-sm text-vault-text-secondary mb-3">{data.bio}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-vault-text-muted">
                  {data.country && (
                    <span className="flex items-center gap-1">
                      <Globe size={11} /> {data.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {data.friendCount || 0} friends
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins size={11} className="text-vault-gold" />
                    <span className="text-vault-gold">{data.coins?.toLocaleString()}</span> coins
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        {data.stats && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-vault-bg-surface border border-vault-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1 text-vault-text-muted text-xs">
                <Gamepad2 size={12} /> Total Games
              </div>
              <p className="text-2xl font-display font-bold text-vault-text-primary">
                {data.stats.totalGames}
              </p>
            </div>
            <div className="bg-vault-bg-surface border border-vault-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1 text-vault-text-muted text-xs">
                <Trophy size={12} className="text-vault-gold" /> Wins
              </div>
              <p className="text-2xl font-display font-bold text-vault-gold">
                {data.stats.wins}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
