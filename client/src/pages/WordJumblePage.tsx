import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, ArrowLeft, Copy, Play, Crown, Trophy,
  Timer, Loader2, CheckCircle2, XCircle, Settings,
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
  roundsWon: number;
  isConnected: boolean;
}

type GamePhase = 'lobby' | 'waiting_room' | 'playing' | 'round_end' | 'game_over';

export default function WordJumblePage() {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();

  const [phase, setPhase] = useState<GamePhase>(urlRoomCode ? 'waiting_room' : 'lobby');
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');
  const [joinCode, setJoinCode] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState('');

  // Game settings
  const [totalRounds, setTotalRounds] = useState(5);
  const [timePerRound, setTimePerRound] = useState(30);
  const [maxPlayers, setMaxPlayers] = useState(6);

  // Round state
  const [currentRound, setCurrentRound] = useState(0);
  const [gameTotalRounds, setGameTotalRounds] = useState(5);
  const [jumbledWord, setJumbledWord] = useState('');
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [roundTimerRunning, setRoundTimerRunning] = useState(false);

  // Result state
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(null);
  const [roundWinnerName, setRoundWinnerName] = useState('');
  const [correctWord, setCorrectWord] = useState('');
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!roundTimerRunning) return;
    setTimeLeft(timePerRound);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRoundTimerRunning(false);
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [roundTimerRunning, currentRound]);

  useEffect(() => {
    if (!socket) return;

    socket.on('wordjumble:created', ({ roomCode: rc }: any) => {
      setRoomCode(rc);
      navigate(`/games/word-jumble/${rc}`, { replace: true });
      setPhase('waiting_room');
      toast.success(`Room created: ${rc}`);
    });

    socket.on('wordjumble:room_state', (data: any) => {
      setPlayers(data.players);
      setIsHost(data.hostId === user?.id);
      setHostId(data.hostId);
      setTotalRounds(data.totalRounds);
      setTimePerRound(data.timePerRound);
      setGameTotalRounds(data.totalRounds);
    });

    socket.on('wordjumble:player_joined', ({ players: p }: any) => setPlayers(p));

    socket.on('wordjumble:started', (data: any) => {
      setPlayers(data.players);
      setGameTotalRounds(data.totalRounds);
      toast.success('Game starting!');
    });

    socket.on('wordjumble:round_start', (data: any) => {
      setCurrentRound(data.roundNumber);
      setJumbledWord(data.jumbledWord);
      setTimePerRound(data.timeLimit);
      setAnswer('');
      setRoundWinnerId(null);
      setAnswerFeedback(null);
      setPlayers(data.players);
      setRoundTimerRunning(true);
      setPhase('playing');
      setTimeout(() => inputRef.current?.focus(), 200);
    });

    socket.on('wordjumble:wrong_answer', () => {
      setAnswerFeedback('wrong');
      setTimeout(() => setAnswerFeedback(null), 600);
      setAnswer('');
    });

    socket.on('wordjumble:round_won', (data: any) => {
      setRoundTimerRunning(false);
      clearInterval(timerRef.current!);
      setRoundWinnerId(data.winnerId);
      setRoundWinnerName(data.winnerUsername);
      setCorrectWord(data.word);
      setPointsAwarded(data.pointsAwarded);
      setPlayers(data.players);
      setPhase('round_end');

      if (data.winnerId === user?.id) {
        toast.success(`+${data.pointsAwarded} pts!`);
        setAnswerFeedback('correct');
      }
    });

    socket.on('wordjumble:round_timeout', (data: any) => {
      setRoundTimerRunning(false);
      setCorrectWord(data.word);
      setRoundWinnerId(null);
      setPlayers(data.players);
      setPhase('round_end');
      toast("⏰ Time's up! No one got it.", { icon: '⏰' });
    });

    socket.on('wordjumble:game_over', (data: any) => {
      setWinnerId(data.winnerId);
      setPlayers(data.players);
      setPhase('game_over');
      if (data.winnerId === user?.id) {
        toast.success('🏆 You won the game!', { duration: 5000 });
      }
    });

    socket.on('error', ({ message }: any) => {
      toast.error(message);
    });

    if (urlRoomCode) {
      socket.emit('wordjumble:join', { roomCode: urlRoomCode });
    }

    return () => {
      ['wordjumble:created','wordjumble:room_state','wordjumble:player_joined',
       'wordjumble:started','wordjumble:round_start','wordjumble:wrong_answer',
       'wordjumble:round_won','wordjumble:round_timeout','wordjumble:game_over','error']
        .forEach((ev) => socket.off(ev));
    };
  }, [socket, user, urlRoomCode]);

  const submitAnswer = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !socket) return;
    socket.emit('wordjumble:answer', { roomCode, answer });
  }, [answer, socket, roomCode]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Copied!');
  };

  // ─── LOBBY ───
  if (phase === 'lobby') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-vault-text-muted hover:text-vault-text-primary mb-6 transition-colors">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Type size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-vault-text-primary">Word Jumble</h1>
              <p className="text-sm text-vault-text-muted">Fastest unscramble wins each round</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Create */}
            <div className="bg-vault-bg-surface border border-vault-border rounded-2xl p-5">
              <h2 className="font-semibold text-vault-text-primary mb-4 flex items-center gap-2">
                <Settings size={15} /> Create Room
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1.5 uppercase tracking-wider">Rounds</label>
                  <select value={totalRounds} onChange={(e) => setTotalRounds(+e.target.value)}
                    className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet">
                    {[3,5,7,10].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1.5 uppercase tracking-wider">Time/Round</label>
                  <select value={timePerRound} onChange={(e) => setTimePerRound(+e.target.value)}
                    className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet">
                    {[15,20,30,45,60].map((n) => <option key={n} value={n}>{n}s</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-vault-text-muted mb-1.5 uppercase tracking-wider">Players</label>
                  <select value={maxPlayers} onChange={(e) => setMaxPlayers(+e.target.value)}
                    className="w-full bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary focus:outline-none focus:border-vault-violet">
                    {[2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={() => socket?.emit('wordjumble:create', { totalRounds, timePerRound, maxPlayers })}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all"
              >
                Create Room
              </button>
            </div>

            {/* Join */}
            <div className="bg-vault-bg-surface border border-vault-border rounded-2xl p-5">
              <h2 className="font-semibold text-vault-text-primary mb-4">Join Room</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 7))}
                  placeholder="Room code (e.g. WJ4XYZ)"
                  className="flex-1 bg-vault-bg-deep border border-vault-border rounded-xl px-3 py-2.5 text-sm font-mono text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => { socket?.emit('wordjumble:join', { roomCode: joinCode }); navigate(`/games/word-jumble/${joinCode}`, { replace: true }); }}
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
  if (phase === 'waiting_room') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-vault-bg-surface border border-vault-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-vault-text-primary">Word Jumble Lobby</h2>
              <button onClick={copyRoomCode}
                className="flex items-center gap-2 bg-vault-bg-elevated border border-vault-border hover:border-blue-500 rounded-xl px-3 py-1.5 text-sm font-mono text-blue-400 transition-colors">
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
            </div>
            {isHost ? (
              <button onClick={() => socket?.emit('wordjumble:start', { roomCode })}
                disabled={players.length < 2}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                <Play size={16} /> {players.length < 2 ? 'Need 2+ players' : 'Start Game'}
              </button>
            ) : (
              <p className="text-center text-sm text-vault-text-muted">Waiting for host…</p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ─── GAME OVER ───
  if (phase === 'game_over') {
    const winner = players.find((p) => p.userId === winnerId);
    const sorted = [...players].sort((a, b) => b.score - a.score || b.roundsWon - a.roundsWon);
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-vault-bg-surface border border-vault-border rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-blue-500/20 to-transparent border-b border-vault-border p-6 text-center">
              <div className="text-5xl mb-3">{winnerId === user?.id ? '🏆' : '🎯'}</div>
              <h2 className="font-display text-2xl font-bold text-vault-text-primary">
                {winnerId === user?.id ? 'You Won!' : 'Game Over'}
              </h2>
              {winner && <p className="text-vault-text-secondary mt-1">{winner.username} wins the Word Jumble!</p>}
            </div>
            <div className="p-6 space-y-3">
              {sorted.map((p, i) => (
                <div key={p.userId}
                  className={`flex items-center gap-3 rounded-xl p-3 ${p.userId === winnerId ? 'bg-vault-gold/10 border border-vault-gold/30' : 'bg-vault-bg-elevated border border-vault-border'}`}>
                  <span className="text-lg font-bold text-vault-text-muted w-6 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                  </span>
                  <Avatar src={p.avatarUrl} username={p.username} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-vault-text-primary">{p.username}</p>
                    <p className="text-xs text-vault-text-muted">{p.roundsWon} round{p.roundsWon !== 1 ? 's' : ''} won</p>
                  </div>
                  <span className="font-mono font-bold text-vault-glow">{p.score}pts</span>
                </div>
              ))}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => navigate('/games/word-jumble')}
                className="flex-1 border border-vault-border text-vault-text-secondary hover:text-vault-text-primary rounded-xl py-2.5 text-sm font-medium transition-colors">
                New Game
              </button>
              <button onClick={() => navigate('/')}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-2.5 text-sm transition-all">
                Lobby
              </button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ─── PLAYING / ROUND END ───
  return (
    <Layout showChat={false}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Round indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-vault-text-muted">
            Round <span className="text-vault-text-primary font-semibold">{currentRound}</span> of {gameTotalRounds}
          </div>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1 rounded-full border ${
            timeLeft <= 10
              ? 'text-vault-danger border-vault-danger/30 bg-vault-danger/10 animate-pulse'
              : 'text-vault-text-secondary border-vault-border'
          }`}>
            <Timer size={13} /> {timeLeft}s
          </div>
        </div>

        {/* Jumbled word display */}
        <div className="text-center mb-8">
          <p className="text-xs text-vault-text-muted mb-3 uppercase tracking-wider">Unscramble this word</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {(phase === 'round_end' ? correctWord : jumbledWord).split('').map((letter, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-display font-bold transition-all ${
                  phase === 'round_end' && roundWinnerId
                    ? 'bg-vault-success/20 border-vault-success text-vault-success'
                    : phase === 'round_end' && !roundWinnerId
                    ? 'bg-vault-danger/20 border-vault-danger text-vault-danger'
                    : 'bg-vault-bg-elevated border-vault-border text-vault-text-primary'
                }`}
              >
                {letter}
              </motion.div>
            ))}
          </div>

          {phase === 'round_end' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              {roundWinnerId ? (
                <p className="text-vault-success font-semibold">
                  {roundWinnerId === user?.id ? `You got it! +${pointsAwarded}pts` : `${roundWinnerName} got it first! +${pointsAwarded}pts`}
                </p>
              ) : (
                <p className="text-vault-danger font-semibold">Time's up! The word was: {correctWord}</p>
              )}
            </motion.div>
          )}
        </div>

        {/* Answer input */}
        {phase === 'playing' && (
          <form onSubmit={submitAnswer} className="mb-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value.toUpperCase())}
                placeholder="Type your answer…"
                autoComplete="off"
                className={`w-full border-2 rounded-2xl px-5 py-4 text-center text-xl font-display font-bold tracking-widest transition-all focus:outline-none ${
                  answerFeedback === 'correct'
                    ? 'border-vault-success bg-vault-success/10 text-vault-success'
                    : answerFeedback === 'wrong'
                    ? 'border-vault-danger bg-vault-danger/10 text-vault-danger animate-bounce'
                    : 'border-vault-border bg-vault-bg-surface text-vault-text-primary focus:border-blue-500'
                }`}
              />
              <AnimatePresence>
                {answerFeedback && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {answerFeedback === 'correct'
                      ? <CheckCircle2 size={20} className="text-vault-success" />
                      : <XCircle size={20} className="text-vault-danger" />
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              disabled={!answer.trim()}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-2xl transition-all"
            >
              Submit Answer
            </button>
          </form>
        )}

        {/* Scores */}
        <div className="grid grid-cols-2 gap-2">
          {[...players].sort((a,b) => b.score - a.score).map((p) => (
            <div key={p.userId}
              className={`flex items-center gap-2 rounded-xl p-2.5 border transition-all ${
                p.userId === user?.id
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-vault-bg-surface border-vault-border'
              }`}>
              <Avatar src={p.avatarUrl} username={p.username} size={28} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-vault-text-primary truncate">{p.username}</p>
                <p className="text-xs text-vault-text-muted">{p.roundsWon} wins</p>
              </div>
              <span className="font-mono font-bold text-sm text-vault-glow">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
