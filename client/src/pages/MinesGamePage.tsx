import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bomb, Users, Copy, Play, ArrowLeft, Clock, Crown,
  Skull, CheckCircle2, Loader2, Share2, Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/layout/Layout';
import Avatar from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

interface Player {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  isEliminated: boolean;
  isConnected: boolean;
}

interface TileState {
  id: number;
  revealed: boolean;
  isMine?: boolean;
}

type GamePhase = 'lobby' | 'playing' | 'game_over';

const GRID_SIZE = 25;
const GRID_COLS = 5;

export default function MinesGamePage() {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [joinCode, setJoinCode] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [board, setBoard] = useState<TileState[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [mineCount, setMineCount] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [turnTimeLimit, setTurnTimeLimit] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [finalBoard, setFinalBoard] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState('');
  const [lastRevealedTile, setLastRevealedTile] = useState<number | null>(null);
  const [hitMineTile, setHitMineTile] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState('');

  // Turn countdown timer
  useEffect(() => {
    if (phase !== 'playing' || !currentTurn) return;
    setTimeLeft(turnTimeLimit);
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurn, phase]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('mines:created', ({ roomCode: rc, sessionId: sid }: any) => {
      setRoomCode(rc);
      setSessionId(sid);
      navigate(`/games/mines/${rc}`, { replace: true });
      setLoading(false);
      toast.success(`Room created: ${rc}`);
    });

    socket.on('mines:room_state', (data: any) => {
      setPlayers(data.players);
      setIsHost(data.hostId === user?.id);
      setHostId(data.hostId);
      setMineCount(data.mineCount);
      setMaxPlayers(data.maxPlayers);
      setTurnTimeLimit(data.turnTimeLimit);
    });

    socket.on('mines:player_joined', ({ players: p }: any) => {
      setPlayers(p);
    });

    socket.on('mines:started', (data: any) => {
      setBoard(data.board);
      setPlayers(data.players);
      setCurrentTurn(data.currentTurn);
      setTurnTimeLimit(data.turnTimeLimit);
      setPhase('playing');
      toast.success('Game started!');
    });

    socket.on('mines:tile_revealed', (data: any) => {
      setBoard(data.board);
      setPlayers(data.players);
      setLastRevealedTile(data.tileId);

      if (data.hitMine) {
        setHitMineTile(data.tileId);
        setTimeout(() => setHitMineTile(null), 800);
        if (data.eliminatedPlayerId === user?.id) {
          toast.error('💥 You hit a mine! You are eliminated.');
        } else {
          const eliminated = data.players.find((p: Player) => p.userId === data.eliminatedPlayerId);
          if (eliminated) toast(`💥 ${eliminated.username} hit a mine!`, { icon: '💣' });
        }
      }

      if (data.nextTurn) setCurrentTurn(data.nextTurn);
    });

    socket.on('mines:next_turn', (data: any) => {
      setCurrentTurn(data.currentTurn);
      setPlayers(data.players);
    });

    socket.on('mines:turn_timeout', (data: any) => {
      const p = players.find((pl) => pl.userId === data.timedOutPlayerId);
      if (p) toast(`⏰ ${p.username}'s turn timed out`, { icon: '⏰' });
    });

    socket.on('mines:game_over', (data: any) => {
      setWinnerId(data.winnerId);
      setFinalBoard(data.finalBoard || null);
      setPlayers(data.players);
      setPhase('game_over');
      const winner = data.players.find((p: Player) => p.userId === data.winnerId);
      if (data.winnerId === user?.id) {
        toast.success('🏆 You won!', { duration: 5000 });
      } else if (winner) {
        toast(`🏆 ${winner.username} wins!`, { duration: 4000 });
      }
    });

    socket.on('mines:player_disconnected', ({ players: p }: any) => {
      setPlayers(p);
    });

    socket.on('error', ({ message }: any) => {
      toast.error(message);
      setLoading(false);
    });

    // Auto-join if roomCode in URL
    if (urlRoomCode && !roomCode) {
      socket.emit('mines:join', { roomCode: urlRoomCode });
    }

    return () => {
      socket.off('mines:created');
      socket.off('mines:room_state');
      socket.off('mines:player_joined');
      socket.off('mines:started');
      socket.off('mines:tile_revealed');
      socket.off('mines:next_turn');
      socket.off('mines:turn_timeout');
      socket.off('mines:game_over');
      socket.off('mines:player_disconnected');
      socket.off('error');
    };
  }, [socket, user, urlRoomCode]);

  const createRoom = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit('mines:create', { mineCount, maxPlayers, turnTimeLimit });
  };

  const joinRoom = () => {
    if (!socket || !joinCode.trim()) return;
    socket.emit('mines:join', { roomCode: joinCode.toUpperCase().trim() });
    navigate(`/games/mines/${joinCode.toUpperCase().trim()}`, { replace: true });
  };

  const startGame = () => {
    if (!socket) return;
    socket.emit('mines:start', { roomCode });
  };

  const revealTile = useCallback((tileId: number) => {
    if (!socket || phase !== 'playing') return;
    if (currentTurn !== user?.id) {
      toast.error("It's not your turn!", { id: 'not-your-turn' });
      return;
    }
    const tile = board[tileId];
    if (!tile || tile.revealed) return;
    socket.emit('mines:reveal', { roomCode, tileId });
  }, [socket, phase, currentTurn, user, board, roomCode]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Room code copied!');
  };

  const isMyTurn = currentTurn === user?.id;
  const me = players.find((p) => p.userId === user?.id);
  const isEliminated = me?.isEliminated || false;

  // ─── LOBBY ───
  if (phase === 'lobby' && !roomCode) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-vault-text-muted hover:text-vault-text-primary mb-6 transition-colors">
            <ArrowLeft size={15} /> Back to Lobby
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Bomb size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-vault-text-primary">Mines</h1>
              <p className="text-sm text-vault-text-muted">Multiplayer mine-sweeping game</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Create Room */}
            <div className="bg-vault-bg-surface border border-vault-border rounded-2xl p-5">
              <h2 className="font-semibold text-vault-text-primary mb-4 flex items-center gap-2">
                <Settings size={15} />
                Create New Room
              </h2>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1.5 uppercase tracking-wider">
                    Mine Count: <span className="text-vault-glow">{mineCount}</span>
                  </label>
                  <input
                    type="range" min={1} max={15} value={mineCount}
                    onChange={(e) => setMineCount(+e.target.value)}
                    className="w-full accent-vault-violet"
                  />
                  <div className="flex justify-between text-xs text-vault-text-muted mt-1">
                    <span>1 (Easy)</span><span>8 (Hard)</span><span>15 (Extreme)</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-vault-text-muted mb-1.5 uppercase tracking-wider">
                      Max Players
                    </label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(+e.target.value)}
                      className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet"
                    >
                      {[2,3,4,5,6].map((n) => <option key={n} value={n}>{n} players</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-vault-text-muted mb-1.5 uppercase tracking-wider">
                      Turn Time
                    </label>
                    <select
                      value={turnTimeLimit}
                      onChange={(e) => setTurnTimeLimit(+e.target.value)}
                      className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet"
                    >
                      {[15,20,30,45,60].map((n) => <option key={n} value={n}>{n}s</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={createRoom}
                disabled={loading}
                className="w-full bg-vault-violet hover:bg-vault-violet-light text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow-sm"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus />}
                Create Room
              </button>
            </div>

            {/* Join Room */}
            <div className="bg-vault-bg-surface border border-vault-border rounded-2xl p-5">
              <h2 className="font-semibold text-vault-text-primary mb-4 flex items-center gap-2">
                <Share2 size={15} />
                Join Existing Room
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Enter room code"
                  className="flex-1 bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2.5 text-sm font-mono text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet tracking-wider"
                />
                <button
                  onClick={joinRoom}
                  disabled={joinCode.length < 4}
                  className="bg-vault-bg-elevated hover:bg-vault-border border border-vault-border disabled:opacity-40 text-vault-text-primary px-4 rounded-xl transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── WAITING ROOM ───
  if (phase === 'lobby' && roomCode) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate('/games/mines')} className="flex items-center gap-2 text-sm text-vault-text-muted hover:text-vault-text-primary mb-6 transition-colors">
            <ArrowLeft size={15} /> Leave Room
          </button>

          <div className="bg-vault-bg-surface border border-vault-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-vault-text-primary">Waiting Room</h2>
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-2 bg-vault-bg-elevated border border-vault-border hover:border-vault-violet rounded-xl px-3 py-1.5 text-sm font-mono text-vault-glow transition-colors"
              >
                {roomCode} <Copy size={12} />
              </button>
            </div>

            <div className="space-y-2 mb-6">
              {players.map((p) => (
                <div key={p.userId} className="flex items-center gap-3 bg-vault-bg-deep rounded-xl p-3">
                  <Avatar src={p.avatarUrl} username={p.username} size={36} />
                  <span className="text-sm font-medium text-vault-text-primary flex-1">{p.username}</span>
                  {p.userId === hostId && (
                    <span className="text-xs text-vault-gold bg-vault-gold/10 border border-vault-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Crown size={10} /> Host
                    </span>
                  )}
                </div>
              ))}
              {players.length < maxPlayers && (
                <div className="border-2 border-dashed border-vault-border rounded-xl p-3 text-center text-sm text-vault-text-muted">
                  Waiting for {maxPlayers - players.length} more player{maxPlayers - players.length !== 1 ? 's' : ''}…
                </div>
              )}
            </div>

            {isHost ? (
              <button
                onClick={startGame}
                disabled={players.length < 2}
                className="w-full bg-vault-violet hover:bg-vault-violet-light disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow-sm"
              >
                <Play size={16} />
                {players.length < 2 ? 'Need 2+ players' : 'Start Game'}
              </button>
            ) : (
              <div className="text-center text-sm text-vault-text-muted py-2">
                Waiting for host to start the game…
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ─── GAME OVER ───
  if (phase === 'game_over') {
    const winner = players.find((p) => p.userId === winnerId);
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-vault-bg-surface border border-vault-border rounded-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-br from-vault-violet/20 to-transparent border-b border-vault-border p-6 text-center">
              <div className="text-5xl mb-3">{winnerId === user?.id ? '🏆' : '💀'}</div>
              <h2 className="font-display text-2xl font-bold text-vault-text-primary">
                {winnerId === user?.id ? 'You Won!' : 'Game Over'}
              </h2>
              {winner && (
                <p className="text-vault-text-secondary mt-1">
                  {winner.username} is victorious
                </p>
              )}
            </div>

            <div className="p-6 space-y-3">
              {sortedPlayers.map((p, i) => (
                <div
                  key={p.userId}
                  className={`flex items-center gap-3 rounded-xl p-3 ${
                    p.userId === winnerId
                      ? 'bg-vault-gold/10 border border-vault-gold/30'
                      : 'bg-vault-bg-elevated border border-vault-border'
                  }`}
                >
                  <span className="text-lg font-bold text-vault-text-muted w-6 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <Avatar src={p.avatarUrl} username={p.username} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-vault-text-primary">{p.username}</p>
                    {p.isEliminated && (
                      <p className="text-xs text-vault-danger flex items-center gap-1">
                        <Skull size={10} /> Eliminated
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-vault-glow">{p.score}</span>
                </div>
              ))}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => navigate('/games/mines')}
                className="flex-1 border border-vault-border text-vault-text-secondary hover:text-vault-text-primary rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                New Game
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-vault-violet hover:bg-vault-violet-light text-white font-semibold rounded-xl py-2.5 text-sm transition-all"
              >
                Lobby
              </button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ─── PLAYING ───
  return (
    <Layout showChat={false}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Players row */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {players.map((p) => (
            <div
              key={p.userId}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                p.userId === currentTurn && !p.isEliminated
                  ? 'bg-vault-violet/20 border-vault-violet shadow-glow-sm'
                  : p.isEliminated
                  ? 'bg-vault-bg-elevated border-vault-border opacity-50'
                  : 'bg-vault-bg-surface border-vault-border'
              }`}
            >
              <div className="relative">
                <Avatar src={p.avatarUrl} username={p.username} size={28} />
                {p.isEliminated && (
                  <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                    <Skull size={12} className="text-vault-danger" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-vault-text-primary leading-none">{p.username}</p>
                <p className="text-xs font-mono text-vault-glow">{p.score}pts</p>
              </div>
              {p.userId === currentTurn && !p.isEliminated && (
                <div className="w-1.5 h-1.5 rounded-full bg-vault-violet animate-pulse ml-1" />
              )}
            </div>
          ))}
        </div>

        {/* Turn indicator + timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-vault-text-secondary">
            {isMyTurn && !isEliminated ? (
              <span className="text-vault-glow font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Your turn — click a tile
              </span>
            ) : isEliminated ? (
              <span className="text-vault-danger flex items-center gap-1.5">
                <Skull size={14} /> You were eliminated
              </span>
            ) : (
              <span>Waiting for {players.find((p) => p.userId === currentTurn)?.username}…</span>
            )}
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${
            timeLeft <= 10 ? 'text-vault-danger animate-pulse' : 'text-vault-text-secondary'
          }`}>
            <Clock size={13} />
            {timeLeft}s
          </div>
        </div>

        {/* Game board */}
        <div
          className="grid gap-2 mb-4"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          {board.map((tile) => {
            const isRevealed = tile.revealed;
            const isMine = tile.isMine;
            const isLastRevealed = tile.id === lastRevealedTile;
            const isHitMine = tile.id === hitMineTile;
            const canClick = !isRevealed && isMyTurn && !isEliminated;

            return (
              <motion.button
                key={tile.id}
                onClick={() => revealTile(tile.id)}
                disabled={!canClick}
                whileHover={canClick ? { scale: 1.06 } : {}}
                whileTap={canClick ? { scale: 0.94 } : {}}
                animate={isHitMine ? { scale: [1, 1.2, 0.95, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`
                  aspect-square rounded-xl border font-bold text-lg
                  flex items-center justify-center transition-all duration-200
                  ${isRevealed
                    ? isMine
                      ? 'bg-vault-danger/20 border-vault-danger/50 text-vault-danger'
                      : 'bg-vault-success/20 border-vault-success/30 text-vault-success'
                    : canClick
                    ? 'bg-vault-bg-elevated border-vault-border hover:border-vault-violet hover:bg-vault-violet/10 cursor-pointer'
                    : 'bg-vault-bg-elevated border-vault-border cursor-not-allowed'
                  }
                `}
              >
                {isRevealed && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {isMine ? '💣' : '✓'}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="text-center text-xs text-vault-text-muted">
          Room: <span className="font-mono text-vault-glow">{roomCode}</span>
          <button onClick={copyRoomCode} className="ml-2 text-vault-text-muted hover:text-vault-glow transition-colors">
            <Copy size={11} className="inline" />
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Plus() {
  return <span className="text-base">+</span>;
}
