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
import { useScrollPopupIntoView } from '@/lib/scroll-popup-into-view';

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
  const [stealMode, setStealMode] = useState(false);
  const [decisionLocked, setDecisionLocked] = useState(false);
  const [decisionVisible, setDecisionVisible] = useState(false);
  const [gameTimeLeft, setGameTimeLeft] = useState<string | null>(null);
  const [displayedEvent, setDisplayedEvent] = useState<{ text: string; tone?: 'positive' | 'negative'; fadingOut: boolean } | null>(null);
  const [popupFadeIn, setPopupFadeIn] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<boolean | null>(null);
  const [lastSubmittedOption, setLastSubmittedOption] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [stableQuizOptions, setStableQuizOptions] = useState<string[]>([]);
  const displayedEventTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackAutoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<ReturnType<typeof createGameSocket> | null>(null);
  const decisionIndexRef = useRef<number | null>(null);
  const lastAnswerRef = useRef<{ cardIndex: number; value: boolean } | null>(null);
  const lastEventRef = useRef<string | null>(null);
  const hasRedirectedToResultsRef = useRef(false);
  const pendingSubmitRef = useRef(false);
  const playerIdRef = useRef<string | null>(null);
  const lastEventRefForMessage = useRef<string | null>(null);

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
          const payload = message.payload;
          setSession(payload);
          const pid = playerIdRef.current;
          const player = payload.players?.find((p: { id: string }) => p.id === pid);
          if (payload.mode !== 'word-heist' && pid && typeof payload.modeState?.answers?.[pid] === 'boolean') {
            const answerValue = payload.modeState.answers[pid];
            const nextIndex = player?.currentIndex ?? 0;
            const cardIndexForAnswer = nextIndex - 1;
            const alreadyProcessed = lastAnswerRef.current?.cardIndex === cardIndexForAnswer && lastAnswerRef.current?.value === answerValue;
            if (!alreadyProcessed) {
              lastAnswerRef.current = { cardIndex: cardIndexForAnswer, value: answerValue };
              pendingSubmitRef.current = false;
              setFeedbackResult(answerValue);
              setPendingSubmit(answerValue ? false : true);
              playSfx(answerValue ? 'correct' : 'incorrect');
              if (feedbackAutoAdvanceRef.current) {
                clearTimeout(feedbackAutoAdvanceRef.current);
                feedbackAutoAdvanceRef.current = null;
              }
              setTimeout(() => {
                setFeedbackResult(null);
                setLastSubmittedOption(null);
              }, 2000);
              if (answerValue) {
                feedbackAutoAdvanceRef.current = setTimeout(() => {
                  setDisplayIndex(nextIndex);
                  feedbackAutoAdvanceRef.current = null;
                }, 2000);
              } else {
                feedbackAutoAdvanceRef.current = setTimeout(() => {
                  setPendingSubmit(false);
                  setDisplayIndex(nextIndex);
                  feedbackAutoAdvanceRef.current = null;
                }, 3000);
              }
            }
          }
          if (payload.mode === 'word-heist' && player?.lastEvent && (player.lastEvent.startsWith('Correct') || player.lastEvent.startsWith('Incorrect')) && lastEventRefForMessage.current !== player.lastEvent) {
            lastEventRefForMessage.current = player.lastEvent;
            const correct = player.lastEvent.startsWith('Correct');
            pendingSubmitRef.current = false;
            setFeedbackResult(correct);
            setPendingSubmit(correct ? false : true);
            playSfx(correct ? 'correct' : 'incorrect');
            if (feedbackAutoAdvanceRef.current) {
              clearTimeout(feedbackAutoAdvanceRef.current);
              feedbackAutoAdvanceRef.current = null;
            }
            setTimeout(() => {
              setFeedbackResult(null);
              setLastSubmittedOption(null);
            }, 2000);
            if (!correct) {
              feedbackAutoAdvanceRef.current = setTimeout(() => {
                setPendingSubmit(false);
                feedbackAutoAdvanceRef.current = null;
              }, 3000);
            }
          }
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
    if (session.status !== 'ended' || !session.endedAt) return;
    if (hasRedirectedToResultsRef.current) return;
    hasRedirectedToResultsRef.current = true;
    clearLastGameCode(storageScope);
    router.push(`/games/results/${session.code}`);
  }, [session, router, storageScope]);



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
  playerIdRef.current = playerId;

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
  const answerResultForCard = session?.modeState?.answers?.[playerId || ''];
  const timeRemaining = useMemo(() => {
    if (!session) return null;
    if (session.settings.gameDurationMinutes && session.startedAt) {
      return gameTimeLeft ?? '0:00';
    }
    return null;
  }, [session, gameTimeLeft]);

  const effectiveIndex = useMemo(() => {
    if (session?.mode === 'word-heist') return player ? player.currentIndex : 0;
    return displayIndex;
  }, [session?.mode, player?.currentIndex, displayIndex]);

  const currentCard = useMemo(() => {
    if (!session) return null;
    if (session.deck.cards.length === 0) return null;
    if (session.mode === 'word-heist') {
      const idx = (player?.currentIndex ?? 0) % session.deck.cards.length;
      return session.deck.cards[idx];
    }
    if (effectiveIndex >= session.deck.cards.length) return null;
    return session.deck.cards[effectiveIndex];
  }, [session, player, effectiveIndex]);

  const isQuizRound = useMemo(() => {
    if (!session || !currentCard) return false;
    const format = (session.settings && 'questionFormat' in session.settings)
      ? (session.settings.questionFormat ?? 'text')
      : 'text';
    if (format === 'quiz') return true;
    if (format === 'mix' && session.modeState?.cardFormats && effectiveIndex < session.modeState.cardFormats.length) {
      return session.modeState.cardFormats[effectiveIndex] === 'quiz';
    }
    return false;
  }, [session, effectiveIndex, currentCard]);

  useEffect(() => {
    if (!session || !currentCard || !isQuizRound) {
      setStableQuizOptions([]);
      return;
    }
    const correctAnswer =
      session.settings.direction === 'en-to-target' ? currentCard.translation : currentCard.english;
    const pool =
      session.settings.direction === 'en-to-target'
        ? session.deck.cards.map(c => c.translation)
        : session.deck.cards.map(c => c.english);
    const wrong = [...new Set(pool)].filter(v => v !== correctAnswer);
    const three = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    setStableQuizOptions([correctAnswer, ...three].sort(() => Math.random() - 0.5));
  }, [currentCard?.id, session?.settings?.direction, isQuizRound]);

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

  const handleQuizOption = (option: string) => {
    if (!playerId) return;
    setLastSubmittedOption(option);
    setPendingSubmit(true);
    pendingSubmitRef.current = true;
    socketRef.current?.send('submit_answer', {
      code,
      playerId,
      answer: option,
      answerTimeMs: Date.now(),
    });
  };

  useEffect(() => {
    if (!session || !playerId || session.mode === 'word-heist') return;
    const cardIndex = player?.currentIndex ?? 0;
    const answerValue = session.modeState?.answers?.[playerId];
    if (typeof answerValue !== 'boolean') return;
    const last = lastAnswerRef.current;
    if (last && last.cardIndex === cardIndex - 1 && last.value === answerValue) return;
    lastAnswerRef.current = { cardIndex: cardIndex - 1, value: answerValue };
  }, [session, playerId, player?.currentIndex]);

  useEffect(() => {
    if (session?.mode !== 'word-heist') return;
    if (!player?.lastEvent) return;
    if (player.lastEvent === lastEventRef.current) return;
    lastEventRef.current = player.lastEvent;
  }, [session?.mode, player?.lastEvent]);

  // Show in-game feedback (correct/incorrect) for 1s with 0.3s fade in/out; only for non–word-heist
  useEffect(() => {
    if (!player?.lastEvent || session?.mode === 'word-heist') return;
    if (player.lastEvent === lastEventRef.current) return;
    lastEventRef.current = player.lastEvent;
    if (displayedEventTimeoutRef.current) {
      clearTimeout(displayedEventTimeoutRef.current);
      displayedEventTimeoutRef.current = null;
    }
    setPopupFadeIn(false);
    setDisplayedEvent({
      text: player.lastEvent,
      tone: player.lastEventTone,
      fadingOut: false,
    });
    const fadeInId = setTimeout(() => setPopupFadeIn(true), 10);
    displayedEventTimeoutRef.current = setTimeout(() => {
      setDisplayedEvent((prev) => (prev ? { ...prev, fadingOut: true } : null));
      displayedEventTimeoutRef.current = setTimeout(() => {
        setDisplayedEvent(null);
        setPopupFadeIn(false);
        displayedEventTimeoutRef.current = null;
      }, 300);
    }, 1000);
    return () => {
      clearTimeout(fadeInId);
      if (displayedEventTimeoutRef.current) {
        clearTimeout(displayedEventTimeoutRef.current);
        displayedEventTimeoutRef.current = null;
      }
    };
  }, [player?.lastEvent, player?.lastEventTone, session?.mode]);

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

  const correctAnswerForOptions =
    currentCard && session
      ? session.settings.direction === 'en-to-target'
        ? currentCard.translation
        : currentCard.english
      : '';

  const showFeedback = typeof answerResultForCard === 'boolean' && feedbackResult !== null;
  const feedbackPopupRef = useScrollPopupIntoView<HTMLParagraphElement>(showFeedback);
  const displayedEventPopupRef = useScrollPopupIntoView(!!displayedEvent);
  const leaderboardPopupRef = useScrollPopupIntoView(leaderboardOpen);

  const quizOptionColors = [
    'bg-rose-600/90 hover:bg-rose-500 border-rose-500/50',
    'bg-amber-600/90 hover:bg-amber-500 border-amber-500/50',
    'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-500/50',
    'bg-blue-600/90 hover:bg-blue-500 border-blue-500/50',
  ];
  const getOptionButtonClass = (option: string) => {
    const base = 'px-4 py-4 rounded-xl border text-white text-left font-medium transition-all flex items-center justify-between gap-2 ';
    if (!showFeedback) return base + (quizOptionColors[stableQuizOptions.indexOf(option) % 4] || 'bg-white/10 border-white/20');
    const isCorrect = option === correctAnswerForOptions;
    const isChosenWrong = option === lastSubmittedOption && feedbackResult === false;
    if (isCorrect) return base + 'bg-emerald-600 border-emerald-400';
    if (isChosenWrong) return base + 'bg-rose-600 border-rose-400';
    return base + 'bg-white/10 border-white/20 opacity-60';
  };

  useEffect(() => {
    if (!currentCard?.id) return;
    if (feedbackAutoAdvanceRef.current) {
      clearTimeout(feedbackAutoAdvanceRef.current);
      feedbackAutoAdvanceRef.current = null;
    }
    setFeedbackResult(null);
    setLastSubmittedOption(null);
  }, [currentCard?.id]);

  useEffect(() => {
    if (!session || !player || session.mode === 'word-heist') return;
    if (showFeedback) return;
    setDisplayIndex(player.currentIndex);
  }, [session, player?.currentIndex, session?.mode, showFeedback]);

  const keyHandlerRef = useRef({
    showFeedback,
    feedbackResult,
    handleQuizOption,
    handleSubmit,
    answer,
    stableQuizOptions,
    session,
    player,
    playerId,
  });
  keyHandlerRef.current = {
    showFeedback,
    feedbackResult,
    handleQuizOption,
    handleSubmit,
    answer,
    stableQuizOptions,
    session,
    player,
    playerId,
  };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ref = keyHandlerRef.current;
      if (!ref.session) return;
      if (ref.showFeedback && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (ref.session.mode !== 'word-heist') {
          const nextIndex = ref.player?.currentIndex ?? 0;
          setDisplayIndex(nextIndex);
        }
        setFeedbackResult(null);
        setLastSubmittedOption(null);
        return;
      }
      if (ref.showFeedback) return;
      if (ref.stableQuizOptions.length > 0 && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < ref.stableQuizOptions.length) {
          e.preventDefault();
          ref.handleQuizOption(ref.stableQuizOptions[idx]);
        }
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        if (ref.stableQuizOptions.length > 0) return;
        if (ref.answer.trim() && ref.session?.status === 'playing' && !ref.player?.pendingDecision) {
          e.preventDefault();
          ref.handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

      <div className="flex justify-between items-start gap-4 mb-4">
        <p className="text-white/70 text-sm">Time remaining: <span className="font-semibold text-white">{timeRemaining ?? '—'}</span></p>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/80">
            Join code: <span className="text-emerald-200 font-semibold">{session.code}</span>
          </div>
          <button
            type="button"
            onClick={() => setLeaderboardOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium border border-white/20"
          >
            View Leaderboard
          </button>
        </div>
      </div>

      <div className="w-full space-y-6">
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <p className="text-white/60 text-sm uppercase tracking-wide">Question</p>
          <div className="text-3xl sm:text-4xl font-bold text-white mt-3">{promptText || '...'}</div>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6">
          <p className="text-white/70 text-sm mb-3">Your Answer</p>
          {isQuizRound && stableQuizOptions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stableQuizOptions.map((option, idx) => (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  onClick={() => handleQuizOption(option)}
                  disabled={session.status !== 'playing' || player?.pendingDecision || pendingSubmit}
                  className={getOptionButtonClass(option) + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                >
                  <span>{option}</span>
                  <span className="text-white/90 font-bold tabular-nums">{idx + 1}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (answer.trim() && session.status === 'playing' && !player?.pendingDecision) handleSubmit();
                  }
                }}
                disabled={session.status !== 'playing' || player?.pendingDecision}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-60 min-w-0"
                placeholder="Type your answer"
              />
              <button
                onClick={handleSubmit}
                disabled={session.status !== 'playing' || player?.pendingDecision}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-50 shrink-0"
              >
                Submit
              </button>
            </div>
          )}
          {showFeedback && (
            <p ref={feedbackPopupRef} className="text-white/60 text-sm mt-3">
              {feedbackResult ? 'Correct!' : 'Incorrect.'}
            </p>
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

      <div className="mt-6 flex flex-wrap items-start justify-end gap-4">
        {isHost && (
          <button
            onClick={handleEnd}
            className="py-3 px-6 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-semibold"
          >
            End Game
          </button>
        )}
        {displayedEvent && (
          <div
            ref={displayedEventPopupRef}
            className={`rounded-xl p-4 border transition-opacity duration-300 max-w-md ${
              displayedEvent.tone === 'positive'
                ? 'text-emerald-100 bg-emerald-500/15 border-emerald-400/30'
                : displayedEvent.tone === 'negative'
                  ? 'text-rose-100 bg-rose-500/15 border-rose-400/30'
                  : 'text-white/80 bg-white/5 border-white/10'
            } ${displayedEvent.fadingOut ? 'opacity-0' : popupFadeIn ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionDuration: '0.3s' }}
          >
            {displayedEvent.text}
          </div>
        )}
      </div>

      {leaderboardOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-transparent" onClick={() => setLeaderboardOpen(false)}>
          <div ref={leaderboardPopupRef} className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Leaderboard</h2>
              <button
                type="button"
                onClick={() => setLeaderboardOpen(false)}
                className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium"
              >
                Close
              </button>
            </div>
            <Leaderboard session={session} />
          </div>
        </div>
      )}
    </GameShell>
  );
}
