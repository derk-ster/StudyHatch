export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';

const STORE_KEY = '__studyhatchGameStore';
const CODE_LENGTH = 6;
const HEARTS_DEFAULT = 3;
const LADDER_TOP = 10;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type GameMode = 'word-heist' | 'lightning-ladder' | 'survival-sprint';
type GameStatus = 'lobby' | 'playing' | 'paused' | 'ended';
type DirectionSetting = 'en-to-target' | 'target-to-en';

type GamePlayer = {
  id: string;
  name: string;
  userId?: string;
  isHost: boolean;
  joinedAt: number;
  connected: boolean;
  stats: { correct: number; incorrect: number };
  bankedKeys: number;
  unbankedKeys: number;
  shielded: boolean;
  ladderPosition: number;
  hearts: number;
  score: number;
  currentIndex: number;
  pendingDecision: boolean;
  lastEvent: string | null;
};

type GameSession = {
  code: string;
  hostId: string;
  hostUserId: string;
  hostKey: string;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  deck: {
    id: string;
    name: string;
    targetLanguage: string;
    cards: Array<{ id: string; english: string; translation: string }>;
  };
  settings: {
    direction: DirectionSetting;
    timePerQuestion: number;
    maxPlayers: number | null;
    classroomOnly: boolean;
    classroomId: string | null;
    allowedUserIds: string[];
  };
  players: Record<string, GamePlayer>;
  modeState: {
    roundIndex: number;
    roundEndAt: number | null;
    roundRemainingMs: number | null;
    answers: Record<string, boolean>;
  };
  roundTimer: NodeJS.Timeout | null;
};

type SocketMessage =
  | { type: 'session_state'; payload: ReturnType<typeof serializeSession> }
  | { type: 'session_joined'; payload: { code: string; playerId: string; hostKey?: string; session: ReturnType<typeof serializeSession> } }
  | { type: 'error'; payload: { message: string } };

const getStore = (): Map<string, GameSession> => {
  const globalAny = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, GameSession> };
  if (!globalAny[STORE_KEY]) {
    globalAny[STORE_KEY] = new Map<string, GameSession>();
  }
  return globalAny[STORE_KEY]!;
};

const SESSION_TTL_SECONDS = 2 * 60 * 60;
const hasRedisUrl = Boolean(process.env.REDIS_URL);
const isVercel = Boolean(process.env.VERCEL);
const sessionKey = (code: string) => `game:${code}`;

const storageErrorMessage = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  const rawMessage = error instanceof Error ? error.message : 'Unknown error';
  const scrubbed = rawMessage.replace(/:\/\/[^@]+@/g, '://***@');
  const suffix = code ? ` (code: ${code})` : '';
  return `Game server storage unavailable. ${scrubbed}.${suffix}`;
};

const redisClient = (() => {
  if (!hasRedisUrl) return null;
  const rawUrl = process.env.REDIS_URL as string;
  const url = rawUrl;
  const useTls = url.startsWith('rediss://');
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    lazyConnect: false,
    connectTimeout: 5000,
    commandTimeout: 5000,
    ...(useTls ? { tls: {} } : {}),
  });
})();

const waitForRedisReady = () =>
  new Promise<void>((resolve, reject) => {
    if (!redisClient) return resolve();
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = (error: unknown) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      redisClient.off('ready', onReady);
      redisClient.off('error', onError);
    };
    redisClient.once('ready', onReady);
    redisClient.once('error', onError);
  });

const ensureRedisConnected = async () => {
  if (!redisClient) return;
  const status = redisClient.status as string;
  if (status === 'ready') return;
  if (status === 'connecting' || status === 'connect' || status === 'reconnecting') {
    await waitForRedisReady();
    return;
  }
  await waitForRedisReady();
};

const getSession = async (code: string, memoryStore: Map<string, GameSession>) => {
  if (redisClient) {
    try {
      await ensureRedisConnected();
      const value = await redisClient.get(sessionKey(code));
      if (!value) return null;
      return JSON.parse(value) as GameSession;
    } catch (error) {
      throw error;
    }
  }
  return memoryStore.get(code) ?? null;
};

const setSession = async (code: string, session: GameSession, memoryStore: Map<string, GameSession>) => {
  if (redisClient) {
    try {
      await ensureRedisConnected();
      await redisClient.set(sessionKey(code), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
      return;
    } catch (error) {
      throw error;
    }
  }
  memoryStore.set(code, session);
};

const normalizeText = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i += 1) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i += 1) {
    for (let j = 1; j <= str1.length; j += 1) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const fuzzyMatch = (input: string, target: string) => {
  const normalizedInput = normalizeText(input);
  const normalizedTarget = normalizeText(target);
  if (!normalizedInput || !normalizedTarget) return false;
  if (normalizedInput === normalizedTarget) return true;
  if (
    normalizedTarget.includes(normalizedInput) ||
    normalizedInput.includes(normalizedTarget)
  ) {
    return true;
  }
  const distance = levenshteinDistance(normalizedInput, normalizedTarget);
  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);
  const similarity = 1 - distance / maxLength;
  return similarity >= 0.85;
};

const generateCode = () => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
};

const createUniqueCode = (store: Map<string, GameSession>) => {
  let code = generateCode();
  while (store.has(code)) {
    code = generateCode();
  }
  return code;
};

const createPlayer = ({ name, userId, isHost }: { name?: string; userId?: string; isHost: boolean }): GamePlayer => ({
  id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: name?.trim() || 'Player',
  userId,
  isHost,
  joinedAt: Date.now(),
  connected: true,
  stats: { correct: 0, incorrect: 0 },
  bankedKeys: 0,
  unbankedKeys: 0,
  shielded: false,
  ladderPosition: 0,
  hearts: HEARTS_DEFAULT,
  score: 0,
  currentIndex: 0,
  pendingDecision: false,
  lastEvent: null,
});

const serializeSession = (session: GameSession) => ({
  code: session.code,
  mode: session.mode,
  status: session.status,
  createdAt: session.createdAt,
  startedAt: session.startedAt,
  endedAt: session.endedAt,
  hostId: session.hostId,
  settings: {
    direction: session.settings.direction,
    timePerQuestion: session.settings.timePerQuestion,
    maxPlayers: session.settings.maxPlayers,
    classroomOnly: session.settings.classroomOnly,
    classroomId: session.settings.classroomId,
  },
  deck: session.deck,
  players: Object.values(session.players),
  modeState: {
    roundIndex: session.modeState.roundIndex,
    roundEndAt: session.modeState.roundEndAt,
    roundRemainingMs: session.modeState.roundRemainingMs,
    answers: session.modeState.answers,
  },
});

const scheduleRound = (session: GameSession) => {
  const now = Date.now();
  const timeMs = session.modeState.roundRemainingMs ?? session.settings.timePerQuestion * 1000;
  session.modeState.roundEndAt = now + timeMs;
  session.modeState.roundRemainingMs = null;
};

const pauseGame = (session: GameSession) => {
  if (session.status !== 'playing') return;
  session.status = 'paused';
  if (session.modeState.roundEndAt) {
    const remaining = Math.max(0, session.modeState.roundEndAt - Date.now());
    session.modeState.roundRemainingMs = remaining;
  }
};

const resumeGame = (session: GameSession) => {
  if (session.status !== 'paused') return;
  session.status = 'playing';
  if (session.mode !== 'word-heist') {
    scheduleRound(session);
  }
};

const getRoundCard = (session: GameSession) => {
  const cards = session.deck?.cards || [];
  if (cards.length === 0) return null;
  const index = session.modeState.roundIndex % cards.length;
  return { card: cards[index], index };
};

const advanceRound = (session: GameSession) => {
  if (session.status !== 'playing') return;
  session.modeState.roundIndex += 1;
  session.modeState.answers = {};
  const cards = session.deck?.cards || [];
  if (session.modeState.roundIndex >= cards.length) {
    session.status = 'ended';
    session.endedAt = Date.now();
    return;
  }
  scheduleRound(session);
};

const handleHeistChoice = (session: GameSession, player: GamePlayer, choice: string) => {
  if (!player.pendingDecision) return;
  if (choice === 'bank') {
    player.bankedKeys += player.unbankedKeys;
    player.unbankedKeys = 0;
    player.lastEvent = 'Banked keys safely.';
  } else if (choice === 'risk') {
    const outcomes = ['steal', 'double', 'lose-half', 'shield'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    if (outcome === 'steal') {
      const victims = Object.values(session.players).filter(
        p => p.id !== player.id && p.unbankedKeys > 0
      );
      if (victims.length === 0) {
        player.lastEvent = 'Heist failed. No keys to steal.';
      } else {
        const victim = victims[Math.floor(Math.random() * victims.length)];
        if (victim.shielded) {
          victim.shielded = false;
          player.lastEvent = `${victim.name} blocked your heist!`;
          victim.lastEvent = 'Shield blocked a heist attempt.';
        } else {
          const stealAmount = Math.max(1, Math.min(2, victim.unbankedKeys));
          victim.unbankedKeys -= stealAmount;
          player.unbankedKeys += stealAmount;
          player.lastEvent = `Stole ${stealAmount} key${stealAmount === 1 ? '' : 's'} from ${victim.name}.`;
          victim.lastEvent = `${player.name} stole ${stealAmount} key${stealAmount === 1 ? '' : 's'} from you.`;
        }
      }
    } else if (outcome === 'double') {
      player.unbankedKeys = Math.max(1, player.unbankedKeys) * 2;
      player.lastEvent = 'Doubled your unbanked keys!';
    } else if (outcome === 'lose-half') {
      player.unbankedKeys = Math.floor(player.unbankedKeys / 2);
      player.lastEvent = 'Lost half your unbanked keys.';
    } else if (outcome === 'shield') {
      player.shielded = true;
      player.lastEvent = 'Shield active: block one heist.';
    }
  }
  player.pendingDecision = false;
  player.currentIndex += 1;
  const cards = session.deck?.cards || [];
  const finished = cards.length > 0 && Object.values(session.players).every(p => p.currentIndex >= cards.length);
  if (finished) {
    session.status = 'ended';
    session.endedAt = Date.now();
  }
};

const startGame = (session: GameSession) => {
  session.status = 'playing';
  session.startedAt = Date.now();
  Object.values(session.players).forEach(player => {
    player.stats = { correct: 0, incorrect: 0 };
    player.bankedKeys = 0;
    player.unbankedKeys = 0;
    player.shielded = false;
    player.ladderPosition = 0;
    player.hearts = HEARTS_DEFAULT;
    player.score = 0;
    player.currentIndex = 0;
    player.pendingDecision = false;
    player.lastEvent = null;
  });
  if (session.mode === 'word-heist') {
    session.modeState = {
      roundIndex: 0,
      roundEndAt: null,
      roundRemainingMs: null,
      answers: {},
    };
    return;
  }
  session.modeState = {
    roundIndex: 0,
    roundEndAt: null,
    roundRemainingMs: null,
    answers: {},
  };
  scheduleRound(session);
};

const handleAnswer = (session: GameSession, player: GamePlayer, answer: string) => {
  if (session.status !== 'playing') return;
  const cards = session.deck?.cards || [];
  if (cards.length === 0) return;
  if (session.mode === 'word-heist') {
    if (player.pendingDecision) return;
    const cardIndex = player.currentIndex % cards.length;
    const card = cards[cardIndex];
    const expected =
      session.settings.direction === 'en-to-target' ? card.translation : card.english;
    const correct = fuzzyMatch(answer, expected);
    if (correct) {
      player.stats.correct += 1;
      player.unbankedKeys += 1;
      player.pendingDecision = true;
      player.lastEvent = 'Correct! Bank or risk your keys.';
    } else {
      player.stats.incorrect += 1;
      player.lastEvent = 'Incorrect. Next card.';
      player.currentIndex += 1;
      const finished = Object.values(session.players).every(p => p.currentIndex >= cards.length);
      if (finished) {
        session.status = 'ended';
        session.endedAt = Date.now();
      }
    }
    return;
  }

  if (session.modeState.answers[player.id]) return;
  session.modeState.answers[player.id] = true;

  const { card } = getRoundCard(session) || {};
  if (!card) return;
  const expected =
    session.settings.direction === 'en-to-target' ? card.translation : card.english;
  const correct = fuzzyMatch(answer, expected);
  const now = Date.now();
  const timeLeft = Math.max(0, (session.modeState.roundEndAt || 0) - now);
  const speedRatio = Math.min(1, timeLeft / (session.settings.timePerQuestion * 1000));
  const speedBonus = Math.max(0, Math.round(speedRatio * 2));

  if (correct) {
    player.stats.correct += 1;
    if (session.mode === 'lightning-ladder') {
      const jump = 1 + speedBonus;
      player.ladderPosition = Math.min(LADDER_TOP, player.ladderPosition + jump);
      player.lastEvent = `+${jump} rung${jump === 1 ? '' : 's'}!`;
      if (player.ladderPosition >= LADDER_TOP) {
        session.status = 'ended';
        session.endedAt = Date.now();
      }
    } else if (session.mode === 'survival-sprint') {
      player.score += 10 + speedBonus * 5;
      player.lastEvent = `Speed bonus +${speedBonus * 5} points!`;
    }
  } else {
    player.stats.incorrect += 1;
    if (session.mode === 'lightning-ladder') {
      player.ladderPosition = Math.max(0, player.ladderPosition - 1);
      player.lastEvent = 'Dropped 1 rung.';
    } else if (session.mode === 'survival-sprint') {
      player.hearts = Math.max(0, player.hearts - 1);
      player.lastEvent = player.hearts === 0 ? 'Eliminated.' : 'Lost a heart.';
    }
  }

  if (session.mode === 'survival-sprint') {
    const alive = Object.values(session.players).filter(p => p.hearts > 0);
    if (alive.length <= 1) {
      session.status = 'ended';
      session.endedAt = Date.now();
    }
  }
};

const tickSession = (session: GameSession) => {
  if (session.status !== 'playing') return;
  if (session.mode === 'word-heist') return;
  if (!session.modeState.roundEndAt) return;
  const now = Date.now();
  if (now < session.modeState.roundEndAt) return;
  advanceRound(session);
};

const createSession = async (payload: any, memoryStore: Map<string, GameSession>): Promise<SocketMessage> => {
  const { deck, mode, settings, host } = payload || {};
  if (!deck || !deck.cards || deck.cards.length === 0) {
    return { type: 'error', payload: { message: 'Deck is missing or empty.' } };
  }
  if (!host?.userId) {
    return { type: 'error', payload: { message: 'Host must be logged in.' } };
  }

  const code = createUniqueCode(memoryStore);
  const hostKey = randomBytes(12).toString('hex');
  const hostPlayer = createPlayer({ name: host.name, userId: host.userId, isHost: true });
  const session: GameSession = {
    code,
    hostId: hostPlayer.id,
    hostUserId: host.userId,
    hostKey,
    mode,
    status: 'lobby',
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    deck: {
      id: deck.id,
      name: deck.name,
      targetLanguage: deck.targetLanguage,
      cards: deck.cards.map((card: any) => ({
        id: card.id,
        english: card.english,
        translation: card.translation,
      })),
    },
    settings: {
      direction: settings?.direction || 'en-to-target',
      timePerQuestion: Number(settings?.timePerQuestion || 20),
      maxPlayers: settings?.maxPlayers ? Number(settings.maxPlayers) : null,
      classroomOnly: Boolean(settings?.classroomOnly),
      classroomId: settings?.classroomId || null,
      allowedUserIds: Array.from(new Set([host.userId, ...(settings?.allowedUserIds || [])])),
    },
    players: {
      [hostPlayer.id]: hostPlayer,
    },
    modeState: {
      roundIndex: 0,
      roundEndAt: null,
      roundRemainingMs: null,
      answers: {},
    },
    roundTimer: null,
  };
  await setSession(code, session, memoryStore);

  return {
    type: 'session_joined',
    payload: {
      code,
      playerId: hostPlayer.id,
      hostKey,
      session: serializeSession(session),
    },
  };
};

const joinSession = async (payload: any, memoryStore: Map<string, GameSession>): Promise<SocketMessage> => {
  const { code, name, userId, hostKey } = payload || {};
  const session = await getSession(code, memoryStore);
  if (!session) {
    return { type: 'error', payload: { message: 'Game not found.' } };
  }
  if (session.status === 'ended') {
    return { type: 'error', payload: { message: 'Game has ended.' } };
  }

  if (hostKey && hostKey === session.hostKey) {
    const hostPlayer = session.players[session.hostId];
    if (hostPlayer) {
      hostPlayer.connected = true;
      return {
        type: 'session_joined',
        payload: {
          code,
          playerId: hostPlayer.id,
          hostKey,
          session: serializeSession(session),
        },
      };
    }
  }

  if (session.settings.classroomOnly) {
    if (!userId) {
      return { type: 'error', payload: { message: 'Login required for classroom games.' } };
    }
    if (session.settings.allowedUserIds?.length > 0) {
      if (!session.settings.allowedUserIds.includes(userId)) {
        return { type: 'error', payload: { message: 'You are not on the class roster.' } };
      }
    } else if (userId !== session.hostUserId) {
      return { type: 'error', payload: { message: 'You are not on the class roster.' } };
    }
  }

  if (
    session.settings.maxPlayers &&
    Object.values(session.players).length >= session.settings.maxPlayers
  ) {
    return { type: 'error', payload: { message: 'Game is full.' } };
  }

  const existing = Object.values(session.players).find(
    player => player.userId && player.userId === userId
  );
  const player = existing || createPlayer({ name, userId, isHost: false });
  player.connected = true;
  session.players[player.id] = player;
  await setSession(code, session, memoryStore);

  return {
    type: 'session_joined',
    payload: {
      code,
      playerId: player.id,
      session: serializeSession(session),
    },
  };
};

const handleAction = async (type: string, payload: any, memoryStore: Map<string, GameSession>): Promise<SocketMessage> => {
  const { code, playerId } = payload || {};
  if (!code || !playerId) {
    return { type: 'error', payload: { message: 'Invalid request.' } };
  }
  const session = await getSession(code, memoryStore);
  if (!session) {
    return { type: 'error', payload: { message: 'Session not found.' } };
  }
  const player = session.players[playerId];
  if (!player) {
    return { type: 'error', payload: { message: 'Player not found.' } };
  }

  if (type === 'start_game') {
    if (player.id !== session.hostId || session.status !== 'lobby') {
      return { type: 'error', payload: { message: 'Only host can start.' } };
    }
    startGame(session);
  }

  if (type === 'resume_game') {
    if (player.id === session.hostId) {
      resumeGame(session);
    }
  }

  if (type === 'end_game') {
    if (player.id === session.hostId) {
      session.status = 'ended';
      session.endedAt = Date.now();
    }
  }

  if (type === 'submit_answer') {
    handleAnswer(session, player, payload?.answer || '');
  }

  if (type === 'word_heist_choice') {
    if (session.mode === 'word-heist') {
      handleHeistChoice(session, player, payload?.choice);
    }
  }

  tickSession(session);
  await setSession(code, session, memoryStore);
  return { type: 'session_state', payload: serializeSession(session) };
};

export async function POST(req: NextRequest) {
  const memoryStore = getStore();
  if (isVercel && !hasRedisUrl) {
    return NextResponse.json(
      { type: 'error', payload: { message: 'Game server storage is not configured.' } } as SocketMessage,
      { status: 503 }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type as string | undefined;
    const payload = body?.payload;

    if (!type) {
      return NextResponse.json({ type: 'error', payload: { message: 'Missing type.' } } as SocketMessage, { status: 400 });
    }

    if (type === 'create_session') {
      const message = await createSession(payload, memoryStore);
      return NextResponse.json(message);
    }

    if (type === 'join_session') {
      const message = await joinSession(payload, memoryStore);
      return NextResponse.json(message);
    }

    if (type === 'request_state') {
      const session = await getSession(payload?.code, memoryStore);
      if (!session) {
        return NextResponse.json({ type: 'error', payload: { message: 'Game not found.' } } as SocketMessage, { status: 404 });
      }
      tickSession(session);
      await setSession(session.code, session, memoryStore);
      return NextResponse.json({ type: 'session_state', payload: serializeSession(session) } as SocketMessage);
    }

    const message = await handleAction(type, payload, memoryStore);
    return NextResponse.json(message);
  } catch (error) {
    console.error('Game storage error (POST)', error);
    return NextResponse.json(
      { type: 'error', payload: { message: storageErrorMessage(error) } } as SocketMessage,
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest) {
  const memoryStore = getStore();
  if (isVercel && !hasRedisUrl) {
    return NextResponse.json(
      { type: 'error', payload: { message: 'Game server storage is not configured.' } } as SocketMessage,
      { status: 503 }
    );
  }
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ type: 'error', payload: { message: 'Missing code.' } } as SocketMessage, { status: 400 });
    }
    const session = await getSession(code, memoryStore);
    if (!session) {
      return NextResponse.json({ type: 'error', payload: { message: 'Game not found.' } } as SocketMessage, { status: 404 });
    }
    tickSession(session);
    await setSession(code, session, memoryStore);
    return NextResponse.json({ type: 'session_state', payload: serializeSession(session) } as SocketMessage);
  } catch (error) {
    console.error('Game storage error (GET)', error);
    return NextResponse.json(
      { type: 'error', payload: { message: storageErrorMessage(error) } } as SocketMessage,
      { status: 503 }
    );
  }
}
