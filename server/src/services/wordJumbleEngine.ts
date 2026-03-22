import { v4 as uuidv4 } from 'uuid';

// Built-in word list (expandable)
const WORD_LIST = [
  'SHADOW', 'BLAZE', 'VAULT', 'CIPHER', 'NEXUS', 'STORM', 'PIXEL', 'QUEST',
  'PRISM', 'EMBER', 'FORGE', 'DRIFT', 'GLIDE', 'SPARK', 'FLARE', 'PHASE',
  'BRIDGE', 'CASTLE', 'DRAGON', 'FALCON', 'GALAXY', 'HUNTER', 'ISLAND',
  'JUNGLE', 'KNIGHT', 'LEGEND', 'MIRROR', 'ORACLE', 'PALACE', 'RIDDLE',
  'SILVER', 'TEMPLE', 'VECTOR', 'WARDEN', 'ZENITH', 'CHROME', 'PLANET',
  'ROCKET', 'TURRET', 'WIZARD', 'BANDIT', 'COBALT', 'DAGGER', 'ELIXIR',
  'FRENZY', 'GOBLIN', 'HOLLOW', 'IMPACT', 'JOKERS', 'KEEPER', 'LANCER',
  'MANGLE', 'NIMBLE', 'OUTLAW', 'PORTAL', 'QUARTZ', 'RAFTER', 'STEALTH',
  'THRONE', 'ULTIMA', 'VORTEX', 'WHIRLWIND', 'XYSTER', 'ZEALOT', 'AMMO',
  'BOLT', 'CLOAK', 'DART', 'EPIC', 'FURY', 'GUST', 'HERO', 'IRON',
  'JADE', 'KEEN', 'LOOT', 'MIST', 'NOVA', 'ORBS', 'PYRE', 'RAZE',
  'SCAN', 'TANK', 'UNIT', 'VEIL', 'WARP', 'XRAY', 'YELL', 'ZONE',
];

export interface WordJumblePlayer {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  roundsWon: number;
  isConnected: boolean;
}

export interface WordJumbleRound {
  roundNumber: number;
  word: string;
  jumbledWord: string;
  startedAt: number;
  timeLimit: number;  // seconds
  winnerId?: string;
  winnerTime?: number; // ms taken to answer
  answers: Array<{ userId: string; answer: string; timestamp: number; correct: boolean }>;
}

export interface WordJumbleState {
  roomCode: string;
  sessionId: string;
  status: 'waiting' | 'in_progress' | 'round_end' | 'completed';
  totalRounds: number;
  currentRound: number;
  timePerRound: number; // seconds
  players: WordJumblePlayer[];
  rounds: WordJumbleRound[];
  hostId: string;
  winnerId?: string;
  createdAt: number;
}

export function jumbleWord(word: string): string {
  const arr = word.split('');
  let jumbled = word;
  // Keep shuffling until different from original
  let tries = 0;
  while (jumbled === word && tries < 20) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    jumbled = arr.join('');
    tries++;
  }
  return jumbled;
}

export function pickRandomWord(usedWords: Set<string>): string {
  const available = WORD_LIST.filter((w) => !usedWords.has(w));
  if (available.length === 0) {
    // Reset and use full list
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

export function startNewRound(
  state: WordJumbleState,
  usedWords: Set<string>
): WordJumbleRound {
  const word = pickRandomWord(usedWords);
  usedWords.add(word);

  const round: WordJumbleRound = {
    roundNumber: state.currentRound + 1,
    word,
    jumbledWord: jumbleWord(word),
    startedAt: Date.now(),
    timeLimit: state.timePerRound,
    answers: [],
  };

  state.currentRound = round.roundNumber;
  state.rounds.push(round);
  state.status = 'in_progress';

  return round;
}

export function submitAnswer(
  state: WordJumbleState,
  userId: string,
  answer: string
): {
  correct: boolean;
  firstCorrect: boolean;
  roundOver: boolean;
  pointsAwarded: number;
} {
  const round = state.rounds[state.rounds.length - 1];
  if (!round) return { correct: false, firstCorrect: false, roundOver: false, pointsAwarded: 0 };

  // Check player hasn't already answered
  const alreadyAnswered = round.answers.some((a) => a.userId === userId);
  if (alreadyAnswered) {
    return { correct: false, firstCorrect: false, roundOver: false, pointsAwarded: 0 };
  }

  const correct = answer.toUpperCase().trim() === round.word;
  const timeTaken = Date.now() - round.startedAt;

  round.answers.push({ userId, answer: answer.toUpperCase(), timestamp: Date.now(), correct });

  if (!correct) {
    return { correct: false, firstCorrect: false, roundOver: false, pointsAwarded: 0 };
  }

  // First correct answer
  const isFirstCorrect = !round.winnerId;
  let pointsAwarded = 0;

  if (isFirstCorrect) {
    round.winnerId = userId;
    round.winnerTime = timeTaken;

    // Speed bonus: faster = more points (max 100, min 20)
    const speedBonus = Math.max(20, Math.round(100 - (timeTaken / (round.timeLimit * 10))));
    pointsAwarded = speedBonus;

    const player = state.players.find((p) => p.userId === userId);
    if (player) {
      player.score += pointsAwarded;
      player.roundsWon += 1;
    }

    // Round ends after first correct answer
    state.status = 'round_end';
  }

  // Check if game over
  if (state.currentRound >= state.totalRounds && isFirstCorrect) {
    const winner = [...state.players].sort(
      (a, b) => b.score - a.score || b.roundsWon - a.roundsWon
    )[0];
    state.status = 'completed';
    state.winnerId = winner?.userId;
  }

  return { correct: true, firstCorrect: isFirstCorrect, roundOver: isFirstCorrect, pointsAwarded };
}

export function createWordJumbleState(
  roomCode: string,
  sessionId: string,
  hostId: string,
  players: WordJumblePlayer[],
  totalRounds: number = 5,
  timePerRound: number = 30
): WordJumbleState {
  return {
    roomCode,
    sessionId,
    status: 'waiting',
    totalRounds,
    currentRound: 0,
    timePerRound,
    players,
    rounds: [],
    hostId,
    createdAt: Date.now(),
  };
}
