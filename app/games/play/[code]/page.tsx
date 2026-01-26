'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import Leaderboard from '@/components/games/Leaderboard';
import WordHeistPanel from '@/components/games/WordHeistPanel';
import LightningLadderPanel from '@/components/games/LightningLadderPanel';
import SurvivalSprintPanel from '@/components/games/SurvivalSprintPanel';
import type { GameSession } from '@/types/games';
import { createGameSocket } from '@/lib/games/ws-client';
import { useAuth } from '@/lib/auth-context';
import { playSfx } from '@/lib/sfx';
import {
  clearLastGameCode,
  getStoredHostKey,
  getStoredPlayerId,
  setLastGameCode,
  setStoredHostKey,
  setStoredPlayerId,
} from '@/lib/games/session-store';

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const code = String(params.code || '').toUpperCase();
  const storageScope = authSession?.userId || 'guest';
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(getStoredPlayerId(code, storageScope));
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(0);
  const [stealMode, setStealMode] = useState(false);
  const [decisionLocked, setDecisionLocked] = useState(false);
  const [decisionVisible, setDecisionVisible] = useState(false);
  const [gameTimeLeft, setGameTimeLeft] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof createGameSocket> | null>(null);
  const decisionIndexRef = useRef<number | null>(null);
  const lastAnswerRef = useRef<{ roundIndex: number; value: boolean } | null>(null);
  const lastEventRef = useRef<string | null>(null);
  const countdownSeconds = 3;

  useEffect(() => {
    setPlayerId(getStoredPlayerId(code, storageScope));
  }, [code, storageScope]);

  useEffect(() => {
    if (!code) return;
    const name =
      localStorage.getItem('studyhatch-game-display-name') ||
      authSession?.username ||
      'Player';
    const hostKey = getStoredHostKey(code, storageScope);

    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === 'error') {
          setError(message.payload.message);
          return;
        }
        if (message.type === 'session_joined') {
          setStoredPlayerId(message.payload.code, message.payload.playerId, storageScope);
          setPlayerId(message.payload.playerId);
          if (message.payload.hostKey) {
            setStoredHostKey(message.payload.code, message.payload.hostKey, storageScope);
          }
          setLastGameCode(message.payload.code, storageScope);
          setSession(message.payload.session);
          return;
        }
        if (message.type === 'session_state') {
          setSession(message.payload);
        }
      },
      onOpen: () => {
        socket.send('join_session', {
          code,
          name,
          userId: authSession?.isGuest ? null : authSession?.userId,
          hostKey,
        });
      },
    });

    socketRef.current = socket;
    return () => socket.close();
  }, [code, authSession?.userId, authSession?.username, authSession?.isGuest, storageScope]);

  useEffect(() => {
    if (!session) return;
    if (session.status === 'ended') {
      clearLastGameCode(storageScope);
      router.push(`/games/results/${session.code}`);
    }
  }, [session, router, storageScope]);

  useEffect(() => {
    if (!session?.modeState?.roundEndAt) {
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const remainingMs = (session.modeState?.roundEndAt || 0) - Date.now();
      const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(remaining);
    }, 250);
    return () => clearInterval(interval);
  }, [session?.modeState?.roundEndAt]);

  useEffect(() => {
    if (!session?.startedAt) {
      setCountdown(0);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Date.now() - (session.startedAt || 0);
      const remaining = Math.max(0, countdownSeconds - Math.floor(elapsed / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [session?.startedAt, countdownSeconds]);

  useEffect(() => {
    if (!session?.startedAt || !session.settings.gameDurationMinutes) {
      setGameTimeLeft(null);
      return;
    }
    const endAt = session.startedAt + session.settings.gameDurationMinutes * 60 * 1000;
    const interval = setInterval(() => {
      const remainingMs = Math.max(0, endAt - Date.now());
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setGameTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 500);
    return () => clearInterval(interval);
  }, [session?.startedAt, session?.settings?.gameDurationMinutes]);

  const player = useMemo(
    () => session?.players.find(p => p.id === playerId) || null,
    [session, playerId]
  );

  useEffect(() => {
    if (!player?.pendingDecision) {
      setStealMode(false);
      setDecisionLocked(false);
    }
  }, [player?.pendingDecision]);

  useEffect(() => {
    if (!player) return;
    if (decisionIndexRef.current === null) {
      decisionIndexRef.current = player.currentIndex;
    }
    if (player.pendingDecision) {
      setDecisionVisible(true);
    } else if (decisionVisible && player.currentIndex !== decisionIndexRef.current) {
      setDecisionVisible(false);
    }
    decisionIndexRef.current = player.currentIndex;
  }, [player?.pendingDecision, player?.currentIndex, decisionVisible]);

  const isHost = playerId === session?.hostId;
  const hasAnswered = session?.modeState?.answers?.[playerId || ''] || false;
  const timeRemaining = useMemo(() => {
    if (!session) return null;
    if (session.settings.gameDurationMinutes && session.startedAt) {
      return gameTimeLeft ?? '0:00';
    }
    if (session.mode !== 'word-heist') {
      return `${Math.max(0, timeLeft).toFixed(0)}s`;
    }
    return null;
  }, [session, timeLeft, gameTimeLeft]);

  const currentCard = useMemo(() => {
    if (!session) return null;
    if (session.deck.cards.length === 0) return null;
    if (session.mode === 'word-heist') {
      const index = player ? player.currentIndex % session.deck.cards.length : 0;
      return session.deck.cards[index];
    }
    const roundIndex = session.modeState?.roundIndex || 0;
    return session.deck.cards[roundIndex % session.deck.cards.length];
  }, [session, player]);

  const promptText = useMemo(() => {
    if (!session || !currentCard) return '';
    if (session.settings.direction === 'en-to-target') {
      return currentCard.english;
    }
    return currentCard.translation;
  }, [session, currentCard]);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    if (!playerId) return;
    socketRef.current?.send('submit_answer', {
      code,
      playerId,
      answer: answer.trim(),
      answerTimeMs: Date.now(),
    });
    setAnswer('');
  };

  useEffect(() => {
    if (!session || !playerId || session.mode === 'word-heist') return;
    const roundIndex = session.modeState?.roundIndex ?? 0;
    const answerValue = session.modeState?.answers?.[playerId];
    if (typeof answerValue !== 'boolean') return;
    const last = lastAnswerRef.current;
    if (last && last.roundIndex === roundIndex && last.value === answerValue) return;
    lastAnswerRef.current = { roundIndex, value: answerValue };
    playSfx(answerValue ? 'correct' : 'incorrect');
  }, [session, playerId]);

  useEffect(() => {
    if (session?.mode !== 'word-heist') return;
    if (!player?.lastEvent) return;
    if (player.lastEvent === lastEventRef.current) return;
    lastEventRef.current = player.lastEvent;
    if (player.lastEvent.startsWith('Correct')) {
      playSfx('correct');
    } else if (player.lastEvent.startsWith('Incorrect')) {
      playSfx('incorrect');
    }
  }, [session?.mode, player?.lastEvent]);

  const handleBank = () => {
    if (!playerId) return;
    setDecisionLocked(true);
    socketRef.current?.send('word_heist_choice', { code, playerId, choice: 'bank' });
  };
  const handleRisk = () => {
    if (!playerId) return;
    setDecisionLocked(true);
    socketRef.current?.send('word_heist_choice', { code, playerId, choice: 'risk' });
  };
  const handleStealStart = () => {
    if (!playerId) return;
    setStealMode(true);
  };
  const handleStealCancel = () => {
    setStealMode(false);
  };
  const handleStealTarget = (targetId: string) => {
    if (!playerId) return;
    setDecisionLocked(true);
    setStealMode(false);
    socketRef.current?.send('word_heist_steal', { code, playerId, targetId });
  };
  const handleResume = () => {
    if (!playerId) return;
    socketRef.current?.send('resume_game', { code, playerId });
  };
  const handleEnd = () => {
    if (!playerId) return;
    socketRef.current?.send('end_game', { code, playerId });
  };

  if (!session) {
    return (
      <GameShell title="Live Game" subtitle="Loading game...">
        {error ? <p className="text-red-300">{error}</p> : <p className="text-white/70">Connecting...</p>}
      </GameShell>
    );
  }

  return (
    <GameShell title="Live Game" subtitle={`Mode: ${session.mode.replace('-', ' ')}`}>
      {error && <p className="text-red-300 mb-4">{error}</p>}

      {session.status === 'paused' && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-200 flex items-center justify-between">
          <span>Game paused — waiting for host.</span>
          {isHost && (
            <button
              onClick={handleResume}
              className="px-3 py-1 rounded-lg bg-amber-500 text-white font-semibold"
            >
              Resume
            </button>
          )}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <div className="rounded-full bg-white/10 border border-white/20 px-4 py-1 text-xs text-white/80">
          Join code: <span className="text-emerald-200 font-semibold">{session.code}</span>
        </div>
      </div>

      {countdown > 0 && (
        <div className="mb-4 rounded-xl border border-blue-400/40 bg-blue-500/10 p-4 text-blue-200 text-center text-xl font-semibold">
          Starting in {countdown}...
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/60 text-sm uppercase tracking-wide">Question</p>
            <div className="text-3xl sm:text-4xl font-bold text-white mt-3">{promptText || '...'}</div>
            {session.mode !== 'word-heist' && (
              <div
                className={`mt-3 text-sm ${
                  timeLeft <= 3 ? 'text-rose-300 animate-pulse' : 'text-emerald-200'
                }`}
              >
                Time Left: <span className="font-semibold">{timeLeft.toFixed(0)}s</span>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <p className="text-white/70 text-sm mb-3">Your Answer</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={session.status !== 'playing' || player?.pendingDecision || hasAnswered}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-60"
                placeholder="Type your answer"
              />
              <button
                onClick={handleSubmit}
                disabled={session.status !== 'playing' || player?.pendingDecision || hasAnswered}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                Submit
              </button>
            </div>
            {hasAnswered && session.mode !== 'word-heist' && (
              <p className="text-white/60 text-sm mt-2">Answer locked for this round.</p>
            )}
          </div>

          {session.mode === 'word-heist' && player && (
            <WordHeistPanel
              player={player}
              players={session.players}
              playerId={playerId}
              stealMode={stealMode}
              decisionVisible={decisionVisible}
              decisionLocked={decisionLocked}
              onBank={handleBank}
              onRisk={handleRisk}
              onStealStart={handleStealStart}
              onStealTarget={handleStealTarget}
              onStealCancel={handleStealCancel}
            />
          )}

          {session.mode === 'lightning-ladder' && <LightningLadderPanel session={session} />}
          {session.mode === 'survival-sprint' && <SurvivalSprintPanel session={session} />}
        </div>

        <div className="space-y-6">
          <Leaderboard session={session} />
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-white/80 text-sm">
              Time Remaining: <span className="font-semibold">{timeRemaining ?? '—'}</span>
            </div>
            {isHost && (
              <button
                onClick={handleEnd}
                className="w-full py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-semibold"
              >
                End Game
              </button>
            )}
          </div>
          {player?.lastEvent && (
            <div
              className={`rounded-xl p-4 border ${
                player.lastEventTone === 'positive'
                  ? 'text-emerald-100 bg-emerald-500/15 border-emerald-400/30'
                  : player.lastEventTone === 'negative'
                    ? 'text-rose-100 bg-rose-500/15 border-rose-400/30'
                    : 'text-white/80 bg-white/5 border-white/10'
              }`}
            >
              {player.lastEvent}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
