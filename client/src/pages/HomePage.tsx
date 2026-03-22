import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bomb, Type, Users, ChevronRight, Plus, Loader2, Trophy, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';

interface GameInfo {
  id: string;
  name: string;
  description: string;
  activePlayers: number;
  waitingRooms: any[];
  minPlayers: number;
  maxPlayers: number;
}

const GAME_ICONS: Record<string, typeof Bomb> = {
  mines: Bomb,
  word_jumble: Type,
};

const GAME_COLORS: Record<string, string> = {
  mines: 'from-red-500/20 to-orange-500/10 border-red-500/30',
  word_jumble: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
};

const GAME_ACCENT: Record<string, string> = {
  mines: 'text-red-400',
  word_jumble: 'text-blue-400',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['active-games'],
    queryFn: () => api.get('/games/active').then((r) => r.data.games as GameInfo[]),
    refetchInterval: 15000,
  });

  const handlePlayGame = (gameId: string) => {
    if (gameId === 'mines') navigate('/games/mines');
    else if (gameId === 'word_jumble') navigate('/games/word-jumble');
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Welcome hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-vault-text-primary mb-2">
            Welcome back, <span className="text-vault-glow">{user?.displayName || user?.username}</span>
          </h1>
          <p className="text-vault-text-secondary">
            {user?.coins.toLocaleString()} coins available · Ready to play?
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-10"
        >
          {[
            { label: 'Total Players Online', value: data ? data.reduce((s, g) => s + g.activePlayers, 0) : '—', icon: Users },
            { label: 'Active Games', value: data ? data.reduce((s, g) => s + g.waitingRooms.length, 0) : '—', icon: TrendingUp },
            { label: 'Your Rank', value: '#—', icon: Trophy },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-vault-bg-surface border border-vault-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-vault-text-muted" />
                <span className="text-xs text-vault-text-muted">{label}</span>
              </div>
              <p className="text-2xl font-display font-bold text-vault-text-primary">{value}</p>
            </div>
          ))}
        </motion.div>

        {/* Games section */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-vault-text-primary">Games</h2>
          <span className="text-xs text-vault-text-muted">Scroll to explore →</span>
        </div>

        {/* Horizontal game scroller */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-4 w-max">
            {isLoading
              ? [1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-72 h-56 bg-vault-bg-surface border border-vault-border rounded-2xl skeleton flex-shrink-0"
                  />
                ))
              : data?.map((game, idx) => {
                  const Icon = GAME_ICONS[game.id] || Gamepad2Fallback;
                  const gradient = GAME_COLORS[game.id] || 'from-violet-500/20 to-purple-500/10 border-violet-500/30';
                  const accent = GAME_ACCENT[game.id] || 'text-vault-glow';

                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`w-72 flex-shrink-0 bg-gradient-to-br ${gradient} border rounded-2xl p-5 cursor-pointer group hover:scale-[1.02] transition-all duration-300`}
                      onClick={() => handlePlayGame(game.id)}
                    >
                      {/* Icon + live count */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-vault-bg-deep/50 flex items-center justify-center ${accent}`}>
                          <Icon size={24} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-vault-bg-deep/40 rounded-full px-2.5 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-vault-success animate-pulse" />
                          <span className="text-xs font-medium text-vault-success">
                            {game.activePlayers} playing
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <h3 className="font-display text-lg font-bold text-vault-text-primary mb-1">
                        {game.name}
                      </h3>
                      <p className="text-sm text-vault-text-secondary mb-4 leading-relaxed">
                        {game.description}
                      </p>

                      {/* Waiting rooms */}
                      {game.waitingRooms.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-vault-text-muted mb-2">
                            {game.waitingRooms.length} open room{game.waitingRooms.length !== 1 ? 's' : ''}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {game.waitingRooms.slice(0, 3).map((room: any) => (
                              <span
                                key={room.roomCode}
                                className="text-xs bg-vault-bg-deep/50 border border-vault-border rounded-lg px-2 py-0.5 font-mono text-vault-text-secondary"
                              >
                                {room.roomCode}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CTA */}
                      <button className="w-full bg-vault-bg-deep/60 hover:bg-vault-bg-deep/80 border border-white/10 rounded-xl py-2 text-sm font-semibold text-vault-text-primary flex items-center justify-center gap-2 group-hover:border-white/20 transition-all">
                        <Plus size={14} />
                        Play Now
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </motion.div>
                  );
                })}
          </div>
        </div>

        {/* Coming soon card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 border border-dashed border-vault-border rounded-2xl p-6 text-center"
        >
          <p className="text-vault-text-muted text-sm">
            More games coming soon — stay tuned 🚀
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}

// Fallback icon
function Gamepad2Fallback({ size }: { size: number }) {
  return <span style={{ fontSize: size }}>🎮</span>;
}
