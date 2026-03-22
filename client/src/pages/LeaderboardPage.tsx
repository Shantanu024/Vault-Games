import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ArrowUp, Loader2, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import Avatar from '../components/ui/Avatar';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coins: number;
  totalGames: number;
  wins: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [gameFilter, setGameFilter] = useState<'all' | 'mines' | 'word_jumble'>('all');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', gameFilter],
    queryFn: () =>
      api
        .get(`/users/leaderboard${gameFilter !== 'all' ? `?gameType=${gameFilter}` : ''}`)
        .then((r) => {
          // Add rank numbers to entries
          return r.data.users.map((entry: LeaderboardEntry, idx: number) => ({
            ...entry,
            rank: idx + 1,
          }));
        }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const userRank = leaderboard?.find((entry: LeaderboardEntry) => entry.userId === user?.id)?.rank;

  const gameLabels: Record<string, string> = {
    all: 'All Games',
    mines: 'Mines',
    word_jumble: 'Word Jumble',
  };

  return (
    <Layout showChat={true}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={32} className="text-vault-gold" />
            <h1 className="font-display text-3xl font-bold text-vault-text-primary">
              Leaderboard
            </h1>
          </div>
          <p className="text-vault-text-secondary">Top players ranked by coins earned</p>
        </motion.div>

        {/* Your Rank Card */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-vault-violet/20 to-vault-blue/20 border border-vault-violet/40 rounded-2xl p-5 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-vault-violet/30 border-2 border-vault-violet flex items-center justify-center">
                  <span className="text-lg font-bold text-vault-glow">#{userRank}</span>
                </div>
                <div>
                  <p className="text-sm text-vault-text-muted">Your Rank</p>
                  <p className="text-xl font-bold text-vault-text-primary">{user?.displayName || user?.username}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-vault-text-muted">Coins</p>
                <p className="text-2xl font-bold text-vault-gold">{user?.coins.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(['all', 'mines', 'word_jumble'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setGameFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                gameFilter === filter
                  ? 'bg-vault-violet text-white shadow-glow-sm'
                  : 'bg-vault-bg-surface border border-vault-border text-vault-text-secondary hover:text-vault-text-primary'
              }`}
            >
              <Filter size={14} className="inline mr-2" />
              {gameLabels[filter]}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-vault-bg-surface border border-vault-border rounded-2xl overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-vault-text-muted" />
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-vault-border bg-vault-bg-elevated/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-vault-text-muted uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-vault-text-muted uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-vault-text-muted uppercase tracking-wider">
                      Coins
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-vault-text-muted uppercase tracking-wider">
                      Games
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-vault-text-muted uppercase tracking-wider">
                      Win Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry: LeaderboardEntry, idx: number) => {
                    const isCurrentUser = entry.userId === user?.id;
                    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';

                    return (
                      <motion.tr
                        key={entry.userId}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`border-b border-vault-border/50 hover:bg-vault-bg-elevated/50 transition-colors ${
                          isCurrentUser ? 'bg-vault-violet/10' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {medal && <span className="text-xl">{medal}</span>}
                            <span className="text-lg font-bold text-vault-text-primary">#{entry.rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={entry.avatarUrl} username={entry.username} size={40} />
                            <div>
                              <p className="font-semibold text-vault-text-primary">{entry.displayName}</p>
                              <p className="text-xs text-vault-text-muted">@{entry.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-vault-gold text-lg">{entry.coins.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-vault-text-secondary">{entry.totalGames}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <ArrowUp size={14} className="text-vault-success" />
                            <span className="font-semibold text-vault-success">
                              {(entry.winRate || 0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-vault-text-muted">No leaderboard data available</p>
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
