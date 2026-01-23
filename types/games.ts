import { Deck } from '@/types/vocab';

export type GameMode = 'word-heist' | 'lightning-ladder' | 'survival-sprint';
export type GameStatus = 'lobby' | 'playing' | 'paused' | 'ended';
export type DirectionSetting = 'en-to-target' | 'target-to-en';

export type GameSettings = {
  direction: DirectionSetting;
  timePerQuestion: number;
  maxPlayers?: number | null;
  gameDurationMinutes?: number | null;
  classroomOnly?: boolean;
  classroomId?: string | null;
};

export type GamePlayer = {
  id: string;
  name: string;
  userId?: string;
  isHost?: boolean;
  joinedAt: number;
  connected: boolean;
  stats: {
    correct: number;
    incorrect: number;
  };
  bankedKeys: number;
  unbankedKeys: number;
  shielded: boolean;
  ladderPosition: number;
  hearts: number;
  score: number;
  currentIndex: number;
  pendingDecision: boolean;
  lastEvent: string | null;
  claps: number;
  lastEventTone?: 'positive' | 'negative';
};

export type GameModeState = {
  roundIndex?: number;
  roundEndAt?: number | null;
  roundRemainingMs?: number | null;
  answers?: Record<string, boolean>;
};

export type GameSession = {
  code: string;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt?: number | null;
  endedAt?: number | null;
  hostId: string;
  settings: GameSettings;
  deck: Pick<Deck, 'id' | 'name' | 'targetLanguage'> & {
    cards: Array<{
      id: string;
      english: string;
      translation: string;
    }>;
  };
  players: GamePlayer[];
  modeState?: GameModeState;
};

export type GameSocketMessage =
  | { type: 'session_state'; payload: GameSession }
  | { type: 'session_joined'; payload: { code: string; playerId: string; hostKey?: string; session: GameSession } }
  | { type: 'error'; payload: { message: string } };
