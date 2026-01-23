const http = require('http');
const next = require('next');
const WebSocket = require('ws');
const { randomBytes } = require('crypto');

const port = parseInt(process.env.PORT, 10) || 3001;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const CODE_LENGTH = 6;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const HEARTS_DEFAULT = 3;
const LADDER_TOP = 10;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const sessions = new Map();
const socketIndex = new Map();

const normalizeText = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const levenshteinDistance = (str1, str2) => {
  const matrix = [];
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

const fuzzyMatch = (input, target) => {
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

const createUniqueCode = () => {
  let code = generateCode();
  while (sessions.has(code)) {
    code = generateCode();
  }
  return code;
};

const createPlayer = ({ name, userId, isHost }) => ({
  id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: name?.trim() || 'Player',
  userId,
  isHost: Boolean(isHost),
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
  lastEventTone: undefined,
  claps: 0,
});

const serializeSession = (session) => {
  const modeState = session.modeState
    ? {
        roundIndex: session.modeState.roundIndex,
        roundEndAt: session.modeState.roundEndAt,
        roundRemainingMs: session.modeState.roundRemainingMs,
        answers: session.modeState.answers,
      }
    : undefined;
  const players = Object.values(session.players).map(player => ({
    id: player.id,
    name: player.name,
    userId: player.userId,
    isHost: player.isHost,
    joinedAt: player.joinedAt,
    connected: player.connected,
    stats: player.stats,
    bankedKeys: player.bankedKeys,
    unbankedKeys: player.unbankedKeys,
    shielded: player.shielded,
    ladderPosition: player.ladderPosition,
    hearts: player.hearts,
    score: player.score,
    currentIndex: player.currentIndex,
    pendingDecision: player.pendingDecision,
    lastEvent: player.lastEvent,
    lastEventTone: player.lastEventTone,
    claps: player.claps,
  }));
  return {
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
      gameDurationMinutes: session.settings.gameDurationMinutes,
      classroomOnly: session.settings.classroomOnly,
      classroomId: session.settings.classroomId,
    },
    deck: session.deck,
    players,
    modeState,
  };
};

const broadcastSession = (session) => {
  const payload = JSON.stringify({ type: 'session_state', payload: serializeSession(session) });
  Object.values(session.players).forEach(player => {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(payload);
    }
  });
};

const sendMessage = (ws, type, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
};

const clearRoundTimer = (session) => {
  if (session.roundTimer) {
    clearTimeout(session.roundTimer);
  }
  session.roundTimer = null;
};

const scheduleRound = (session) => {
  clearRoundTimer(session);
  const now = Date.now();
  const timeMs = session.modeState.roundRemainingMs ?? session.settings.timePerQuestion * 1000;
  session.modeState.roundEndAt = now + timeMs;
  session.modeState.roundRemainingMs = null;
  session.roundTimer = setTimeout(() => {
    advanceRound(session);
  }, timeMs);
};

const checkGameDuration = (session) => {
  if (!session.settings.gameDurationMinutes || !session.startedAt) return false;
  const endAt = session.startedAt + session.settings.gameDurationMinutes * 60 * 1000;
  if (Date.now() >= endAt) {
    session.status = 'ended';
    session.endedAt = Date.now();
    clearRoundTimer(session);
    broadcastSession(session);
    return true;
  }
  return false;
};

const pauseGame = (session) => {
  if (session.status !== 'playing') return;
  session.status = 'paused';
  if (session.modeState?.roundEndAt) {
    const remaining = Math.max(0, session.modeState.roundEndAt - Date.now());
    session.modeState.roundRemainingMs = remaining;
  }
  clearRoundTimer(session);
  broadcastSession(session);
};

const resumeGame = (session) => {
  if (session.status !== 'paused') return;
  session.status = 'playing';
  if (session.mode !== 'word-heist') {
    scheduleRound(session);
  }
  broadcastSession(session);
};

const getRoundCard = (session) => {
  const cards = session.deck?.cards || [];
  if (cards.length === 0) return null;
  const index = session.modeState.roundIndex % cards.length;
  return { card: cards[index], index };
};

const advanceRound = (session) => {
  if (checkGameDuration(session)) return;
  if (session.status !== 'playing') return;
  session.modeState.roundIndex += 1;
  session.modeState.answers = {};
  const cards = session.deck?.cards || [];
  if (session.modeState.roundIndex >= cards.length) {
    session.status = 'ended';
    session.endedAt = Date.now();
    clearRoundTimer(session);
    broadcastSession(session);
    return;
  }
  scheduleRound(session);
  broadcastSession(session);
};

const handleHeistChoice = (session, player, choice) => {
  if (checkGameDuration(session)) return;
  if (!player.pendingDecision) return;
  if (choice === 'bank') {
    player.bankedKeys += player.unbankedKeys;
    player.unbankedKeys = 0;
    player.lastEvent = 'Banked keys safely.';
    player.lastEventTone = 'positive';
  } else if (choice === 'risk') {
    const outcomes = ['steal', 'double', 'lose-half', 'shield'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    if (outcome === 'steal') {
      const victims = Object.values(session.players).filter(
        p => p.id !== player.id && p.unbankedKeys > 0
      );
      if (victims.length === 0) {
        player.lastEvent = 'Heist failed. No keys to steal.';
        player.lastEventTone = 'negative';
      } else {
        const victim = victims[Math.floor(Math.random() * victims.length)];
        if (victim.shielded) {
          victim.shielded = false;
          player.lastEvent = `${victim.name} blocked your heist!`;
          player.lastEventTone = 'negative';
          victim.lastEvent = 'Shield blocked a heist attempt.';
          victim.lastEventTone = 'positive';
        } else {
          const stealAmount = Math.max(1, Math.min(2, victim.unbankedKeys));
          victim.unbankedKeys -= stealAmount;
          player.unbankedKeys += stealAmount;
          player.lastEvent = `Stole ${stealAmount} key${stealAmount === 1 ? '' : 's'} from ${victim.name}.`;
          player.lastEventTone = 'positive';
          victim.lastEvent = `${player.name} stole ${stealAmount} key${stealAmount === 1 ? '' : 's'} from you.`;
          victim.lastEventTone = 'negative';
        }
      }
    } else if (outcome === 'double') {
      player.unbankedKeys = Math.max(1, player.unbankedKeys) * 2;
      player.lastEvent = 'Doubled your unbanked keys!';
      player.lastEventTone = 'positive';
    } else if (outcome === 'lose-half') {
      player.unbankedKeys = Math.floor(player.unbankedKeys / 2);
      player.lastEvent = 'Lost half your unbanked keys.';
      player.lastEventTone = 'negative';
    } else if (outcome === 'shield') {
      player.shielded = true;
      player.lastEvent = 'Shield active: block one heist.';
      player.lastEventTone = 'positive';
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

const handleHeistSteal = (session, player, targetId) => {
  if (!player.pendingDecision) return;
  const target = targetId ? session.players[targetId] : null;
  if (!target || target.id === player.id) {
    player.lastEvent = 'Select a valid target to steal from.';
    player.lastEventTone = 'negative';
  } else if (target.shielded) {
    target.shielded = false;
    player.lastEvent = `${target.name} blocked your steal attempt.`;
    player.lastEventTone = 'negative';
    target.lastEvent = 'Shield blocked a steal attempt.';
    target.lastEventTone = 'positive';
  } else if (target.bankedKeys <= 0) {
    player.lastEvent = `${target.name} has no banked keys to steal.`;
    player.lastEventTone = 'negative';
  } else {
    const success = Math.random() < 0.5;
    if (success) {
      target.bankedKeys -= 1;
      player.bankedKeys += 1;
      player.lastEvent = `Stole 1 banked key from ${target.name}!`;
      player.lastEventTone = 'positive';
      target.lastEvent = `${player.name} stole 1 of your banked keys.`;
      target.lastEventTone = 'negative';
    } else {
      player.lastEvent = `Steal failed against ${target.name}.`;
      player.lastEventTone = 'negative';
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

const startGame = (session) => {
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
    player.lastEventTone = undefined;
    player.claps = 0;
  });
  if (session.mode === 'word-heist') {
    session.modeState = { roundIndex: 0 };
    broadcastSession(session);
    return;
  }
  session.modeState = {
    roundIndex: 0,
    roundEndAt: null,
    roundRemainingMs: null,
    answers: {},
  };
  scheduleRound(session);
  broadcastSession(session);
};

const handleAnswer = (session, player, answer, answerTimeMs) => {
  if (checkGameDuration(session)) return;
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
      player.lastEvent = 'Correct! Bank, risk, or steal.';
      player.lastEventTone = 'positive';
    } else {
      player.stats.incorrect += 1;
      player.lastEvent = 'Incorrect. Next card.';
      player.lastEventTone = 'negative';
      player.currentIndex += 1;
      const finished = Object.values(session.players).every(p => p.currentIndex >= cards.length);
      if (finished) {
        session.status = 'ended';
        session.endedAt = Date.now();
      }
    }
    broadcastSession(session);
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
  const timeLeft = Math.max(0, session.modeState.roundEndAt - now);
  const speedRatio = Math.min(1, timeLeft / (session.settings.timePerQuestion * 1000));
  const speedBonus = Math.max(0, Math.round(speedRatio * 2));

  if (correct) {
    player.stats.correct += 1;
    if (session.mode === 'lightning-ladder') {
      const jump = 1 + speedBonus;
      player.ladderPosition = Math.min(LADDER_TOP, player.ladderPosition + jump);
      player.lastEvent = `+${jump} rung${jump === 1 ? '' : 's'}!`;
      player.lastEventTone = 'positive';
      if (player.ladderPosition >= LADDER_TOP) {
        session.status = 'ended';
        session.endedAt = Date.now();
        clearRoundTimer(session);
      }
    } else if (session.mode === 'survival-sprint') {
      player.score += 10 + speedBonus * 5;
      player.lastEvent = `Speed bonus +${speedBonus * 5} points!`;
      player.lastEventTone = 'positive';
    }
  } else {
    player.stats.incorrect += 1;
    if (session.mode === 'lightning-ladder') {
      player.ladderPosition = Math.max(0, player.ladderPosition - 1);
      player.lastEvent = 'Dropped 1 rung.';
      player.lastEventTone = 'negative';
    } else if (session.mode === 'survival-sprint') {
      player.hearts = Math.max(0, player.hearts - 1);
      player.lastEvent = player.hearts === 0 ? 'Eliminated.' : 'Lost a heart.';
      player.lastEventTone = 'negative';
    }
  }

  if (session.mode === 'survival-sprint') {
    const alive = Object.values(session.players).filter(p => p.hearts > 0);
    if (alive.length <= 1) {
      session.status = 'ended';
      session.endedAt = Date.now();
      clearRoundTimer(session);
    }
  }

  broadcastSession(session);
};

const createSession = (payload, ws) => {
  const { deck, mode, settings, host } = payload || {};
  if (!deck || !deck.cards || deck.cards.length === 0) {
    sendMessage(ws, 'error', { message: 'Deck is missing or empty.' });
    return;
  }
  if (!host?.userId) {
    sendMessage(ws, 'error', { message: 'Host must be logged in.' });
    return;
  }
  const code = createUniqueCode();
  const hostKey = randomBytes(12).toString('hex');
  const hostPlayer = createPlayer({ name: host.name, userId: host.userId, isHost: true });
  hostPlayer.socket = ws;
  const session = {
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
      cards: deck.cards.map(card => ({
        id: card.id,
        english: card.english,
        translation: card.translation,
      })),
    },
    settings: {
      direction: settings?.direction || 'en-to-target',
      timePerQuestion: Number(settings?.timePerQuestion || 20),
      maxPlayers: settings?.maxPlayers ? Number(settings.maxPlayers) : null,
      gameDurationMinutes: settings?.gameDurationMinutes ? Number(settings.gameDurationMinutes) : null,
      classroomOnly: Boolean(settings?.classroomOnly),
      classroomId: settings?.classroomId || null,
      allowedUserIds: Array.from(new Set([host.userId, ...(settings?.allowedUserIds || [])])),
    },
    players: {
      [hostPlayer.id]: hostPlayer,
    },
    modeState: {},
    roundTimer: null,
  };
  sessions.set(code, session);
  socketIndex.set(ws, { code, playerId: hostPlayer.id });
  sendMessage(ws, 'session_joined', {
    code,
    playerId: hostPlayer.id,
    hostKey,
    session: serializeSession(session),
  });
};

const joinSession = (payload, ws) => {
  const { code, name, userId, hostKey, allowEnded } = payload || {};
  const session = sessions.get(code);
  if (!session) {
    sendMessage(ws, 'error', { message: 'Game not found.' });
    return;
  }
  if (session.status === 'ended' && !allowEnded) {
    sendMessage(ws, 'error', { message: 'Game has ended.' });
    return;
  }
  if (hostKey && hostKey === session.hostKey) {
    const hostPlayer = session.players[session.hostId];
    if (hostPlayer) {
      hostPlayer.connected = true;
      hostPlayer.socket = ws;
      socketIndex.set(ws, { code, playerId: hostPlayer.id });
      sendMessage(ws, 'session_joined', {
        code,
        playerId: hostPlayer.id,
        hostKey,
        session: serializeSession(session),
      });
      broadcastSession(session);
      return;
    }
  }

  if (session.settings.classroomOnly) {
    if (!userId) {
      sendMessage(ws, 'error', { message: 'Login required for classroom games.' });
      return;
    }
    if (session.settings.allowedUserIds?.length > 0) {
      if (!session.settings.allowedUserIds.includes(userId)) {
        sendMessage(ws, 'error', { message: 'You are not on the class roster.' });
        return;
      }
    } else if (userId !== session.hostUserId) {
      sendMessage(ws, 'error', { message: 'You are not on the class roster.' });
      return;
    }
  }
  if (
    session.settings.maxPlayers &&
    Object.values(session.players).length >= session.settings.maxPlayers
  ) {
    sendMessage(ws, 'error', { message: 'Game is full.' });
    return;
  }

  const existing = Object.values(session.players).find(
    player => player.userId && player.userId === userId
  );
  const player = existing || createPlayer({ name, userId, isHost: false });
  player.connected = true;
  player.socket = ws;
  session.players[player.id] = player;
  socketIndex.set(ws, { code, playerId: player.id });
  sendMessage(ws, 'session_joined', {
    code,
    playerId: player.id,
    session: serializeSession(session),
  });
  broadcastSession(session);
};

const handleMessage = (ws, raw) => {
  let message;
  try {
    message = JSON.parse(raw);
  } catch (error) {
    sendMessage(ws, 'error', { message: 'Invalid message format.' });
    return;
  }
  const { type, payload } = message || {};
  if (type === 'create_session') {
    createSession(payload, ws);
    return;
  }
  if (type === 'join_session') {
    joinSession(payload, ws);
    return;
  }

  const socketInfo = socketIndex.get(ws);
  const session = socketInfo ? sessions.get(socketInfo.code) : null;
  const player = session ? session.players[socketInfo.playerId] : null;
  if (!session || !player) {
    sendMessage(ws, 'error', { message: 'Session not found.' });
    return;
  }

  if (type === 'start_game') {
    if (player.id !== session.hostId) return;
    if (session.status !== 'lobby') return;
    startGame(session);
    return;
  }

  if (type === 'resume_game') {
    if (player.id !== session.hostId) return;
    resumeGame(session);
    return;
  }

  if (type === 'end_game') {
    if (player.id !== session.hostId) return;
    session.status = 'ended';
    session.endedAt = Date.now();
    clearRoundTimer(session);
    broadcastSession(session);
    return;
  }

  if (type === 'clap') {
    if (session.status !== 'ended') return;
    player.claps += 1;
    broadcastSession(session);
    return;
  }

  if (type === 'submit_answer') {
    handleAnswer(session, player, payload?.answer || '', payload?.answerTimeMs);
    return;
  }

  if (type === 'word_heist_choice') {
    if (session.mode !== 'word-heist') return;
    handleHeistChoice(session, player, payload?.choice);
    broadcastSession(session);
    return;
  }

  if (type === 'word_heist_steal') {
    if (session.mode !== 'word-heist') return;
    handleHeistSteal(session, player, payload?.targetId);
    broadcastSession(session);
    return;
  }

  if (type === 'request_state') {
    sendMessage(ws, 'session_state', serializeSession(session));
    return;
  }
};

const handleDisconnect = (ws) => {
  const socketInfo = socketIndex.get(ws);
  if (!socketInfo) return;
  const session = sessions.get(socketInfo.code);
  if (!session) return;
  const player = session.players[socketInfo.playerId];
  if (player) {
    player.connected = false;
    player.socket = null;
    if (player.id === session.hostId) {
      pauseGame(session);
    } else {
      broadcastSession(session);
    }
  }
  socketIndex.delete(ws);
};

const sweepSessions = () => {
  const now = Date.now();
  sessions.forEach((session, code) => {
    const allDisconnected = Object.values(session.players).every(p => !p.connected);
    const expired = now - session.createdAt > SESSION_TTL_MS;
    if (allDisconnected && expired) {
      sessions.delete(code);
    }
  });
};

setInterval(sweepSessions, 5 * 60 * 1000);

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));
  const wss = new WebSocket.Server({ noServer: true });
  const upgradeHandler = app.getUpgradeHandler();

  wss.on('connection', (ws) => {
    ws.on('message', (data) => handleMessage(ws, data));
    ws.on('close', () => handleDisconnect(ws));
  });

  server.on('upgrade', (req, socket, head) => {
    if (req.url && req.url.startsWith('/games')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
      return;
    }
    upgradeHandler(req, socket, head);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
