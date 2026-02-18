'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import PronounceButton from '@/components/PronounceButton';
import LanguageBadge from '@/components/LanguageBadge';
import { VocabCard } from '@/types/vocab';
import { getProgress, updateProgress } from '@/lib/storage';
import { useDeckForActivity, isPreviewDeck } from '@/lib/useDeckForActivity';
import { updateStreakOnStudy } from '@/lib/streak';
import { getLanguageName } from '@/lib/languages';
import { playSfx } from '@/lib/sfx';
import { addXP, XP_REWARDS } from '@/lib/xp';
import { useScrollPopupIntoView } from '@/lib/scroll-popup-into-view';

type CardState = {
  id: string;
  text: string;
  isSpanish: boolean;
  isMatched: boolean;
  cardId: string; // Original card ID for matching
};

export default function MatchPage() {
  const searchParams = useSearchParams();
  const [spanishCards, setSpanishCards] = useState<CardState[]>([]);
  const [englishCards, setEnglishCards] = useState<CardState[]>([]);
  const [selectedSpanish, setSelectedSpanish] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [incorrectCards, setIncorrectCards] = useState<Set<string>>(new Set());
  const [sessionXp, setSessionXp] = useState(0);
  const gameCompletePopupRef = useScrollPopupIntoView(gameComplete);

  const deckId = searchParams.get('deck');
  const { deck, isSharedPreviewLoading } = useDeckForActivity(deckId);
  const basePath = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH || '') : '';

  useEffect(() => {
    if (deckId) {
      updateStreakOnStudy();
    }
  }, [deckId]);
  const progress = getProgress();
  const targetLanguageName = deck ? getLanguageName(deck.targetLanguage) : 'Translation';
  const totalPairs = deck ? deck.cards.length : 0;
  const pairsPerRound = 8;
  const totalRounds = Math.max(1, Math.ceil(totalPairs / pairsPerRound));

  // Get per-deck progress
  const deckProgress = deckId && progress.deckProgress?.[deckId] ? progress.deckProgress[deckId] : {
    matchBestTime: undefined,
  };

  // Helper to update per-deck progress
  const updateDeckProgress = (updates: Partial<typeof deckProgress>) => {
    if (!deckId || isPreviewDeck(deck)) return;
    const newProgress = { ...getProgress() };
    if (!newProgress.deckProgress) {
      newProgress.deckProgress = {};
    }
    if (!newProgress.deckProgress[deckId]) {
      newProgress.deckProgress[deckId] = {
        starredCards: [],
        knownCards: [],
        learningCards: [],
        cardStats: {},
        matchBestTime: undefined,
        quizHighScore: undefined,
        quizStreak: 0,
      };
    }
    newProgress.deckProgress[deckId] = {
      ...newProgress.deckProgress[deckId],
      ...updates,
    };
    updateProgress(newProgress);
  };

  const getCurrentDeckProgress = () => {
    const currentProgress = getProgress();
    return deckId && currentProgress.deckProgress?.[deckId]
      ? currentProgress.deckProgress[deckId]
      : {
          starredCards: [],
          knownCards: [],
          learningCards: [],
          cardStats: {},
          matchBestTime: undefined,
          quizHighScore: undefined,
          quizStreak: 0,
        };
  };

  const setupRound = (roundIndex: number, resetTimer: boolean) => {
    if (!deck) return;
    const startIndex = roundIndex * pairsPerRound;
    const roundCards = deck.cards.slice(startIndex, startIndex + pairsPerRound);

    const translation: CardState[] = roundCards.map(card => ({
      id: `${card.id}-translation`,
      text: card.translation,
      isSpanish: true,
      isMatched: false,
      cardId: card.id,
    }));

    const english: CardState[] = roundCards.map(card => ({
      id: `${card.id}-english`,
      text: card.english,
      isSpanish: false,
      isMatched: false,
      cardId: card.id,
    }));

    const shuffledTranslation = translation.sort(() => Math.random() - 0.5);
    const shuffledEnglish = english.sort(() => Math.random() - 0.5);

    setSpanishCards(shuffledTranslation);
    setEnglishCards(shuffledEnglish);
    setSelectedSpanish(null);
    setMatchedPairs(0);
    setIncorrectCards(new Set());
    setGameComplete(false);

    if (resetTimer) {
      setStartTime(null);
      setElapsedTime(0);
    }
  };

  useEffect(() => {
    if (!deck) return;
    setCurrentRound(0);
    setupRound(0, true);
    setSessionXp(0);
  }, [deckId, deck]);

  useEffect(() => {
    if (startTime && !gameComplete) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, gameComplete]);

  const handleSpanishClick = (cardId: string) => {
    if (gameComplete || selectedSpanish) return;
    
    const card = spanishCards.find(c => c.id === cardId);
    if (!card || card.isMatched) return;

    if (!startTime) {
      setStartTime(Date.now());
    }

    setSelectedSpanish(cardId);
  };

  const handleEnglishClick = (cardId: string) => {
    if (gameComplete || !selectedSpanish) return;
    
    const englishCard = englishCards.find(c => c.id === cardId);
    const spanishCard = spanishCards.find(c => c.id === selectedSpanish);
    
    if (!englishCard || !spanishCard || englishCard.isMatched) return;

    // Check if they match (same cardId)
    if (englishCard.cardId === spanishCard.cardId) {
      // Match!
      playSfx('correct');
      setSpanishCards(prev => prev.map(c => 
        c.id === selectedSpanish ? { ...c, isMatched: true } : c
      ));
      setEnglishCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, isMatched: true } : c
      ));
      
      setMatchedPairs(prev => {
        const newCount = prev + 1;
        const roundPairs = Math.min(pairsPerRound, deck ? deck.cards.length - currentRound * pairsPerRound : pairsPerRound);

        if (newCount === roundPairs) {
          const isLastRound = currentRound + 1 >= totalRounds;
          if (isLastRound) {
            setGameComplete(true);
            const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
            const currentDeckProgress = getCurrentDeckProgress();
            if (!currentDeckProgress.matchBestTime || finalTime < currentDeckProgress.matchBestTime) {
              updateDeckProgress({ matchBestTime: finalTime });
            }
          } else {
            const nextRound = currentRound + 1;
            setCurrentRound(nextRound);
            setupRound(nextRound, false);
          }
        }
        return newCount;
      });

      addXP(XP_REWARDS.CORRECT_ANSWER, deckId || undefined);
      setSessionXp(prev => prev + XP_REWARDS.CORRECT_ANSWER);
      
      // Reset selection immediately for correct match
      setSelectedSpanish(null);
    } else {
      // Wrong match - show red feedback
      playSfx('incorrect');
      setIncorrectCards(new Set([selectedSpanish, cardId]));
      
      // After 1 second, clear red feedback and reset selection
      setTimeout(() => {
        setIncorrectCards(new Set());
        setSelectedSpanish(null);
      }, 1000);
    }
  };

  const handleReset = () => {
    if (!deck) return;
    setCurrentRound(0);
    setupRound(0, true);
    setSessionXp(0);
  };

  if (isSharedPreviewLoading) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-xl text-white/70">Loading shared deck…</p>
            <a href={typeof window !== 'undefined' ? `${window.location.origin}${basePath}/study${window.location.hash || ''}` : `${basePath}/study`} className="mt-4 inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all">
              ← Back to Activities
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-xl text-white/70">Deck not found.</p>
            <a href={deckId === 'shared-preview' && typeof window !== 'undefined' ? `${window.location.origin}${basePath}/study${window.location.hash || ''}` : (basePath || '/')} className="mt-4 inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all">
              {deckId === 'shared-preview' ? '← Back to Activities' : 'Go Home'}
            </a>
          </div>
        </main>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold mb-2">Match Game</h1>
                <p className="text-white/70">Match {targetLanguageName} words with their English translations</p>
                {deck && <LanguageBadge languageCode={deck.targetLanguage} />}
              </div>
              {deckId === 'shared-preview' ? (
                <a href={typeof window !== 'undefined' ? `${window.location.origin}${basePath}/study${window.location.hash || ''}` : `${basePath}/study`} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm font-medium inline-block shrink-0">
                  ← Back to Activities
                </a>
              ) : (
                <Link href={deckId ? `/study?deck=${deckId}` : '/'} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm font-medium inline-block shrink-0">
                  ← Back to Activities
                </Link>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-white/70">Time</div>
              {deckProgress.matchBestTime && (
                <div className="text-sm text-white/60 mt-1">
                  Best: {formatTime(deckProgress.matchBestTime)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Complete Modal */}
        {gameComplete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in overflow-y-auto">
            <div ref={gameCompletePopupRef} className="modal-panel bg-gray-900 rounded-2xl p-4 sm:p-6 md:p-8 border border-white/20 card-glow animate-slide-up my-auto max-w-md">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
                <p className="text-xl text-white/70 mb-2">You completed the game in</p>
                <p className="text-4xl font-bold text-purple-400 mb-6">{formatTime(elapsedTime)}</p>
                <p className="text-white/70 mb-6">
                  XP gained: <span className="text-emerald-400 font-semibold">{sessionXp}</span>
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                  >
                    Play Again
                  </button>
                  {deckId === 'shared-preview' ? (
                    <a href={typeof window !== 'undefined' ? `${window.location.origin}${basePath}/study${window.location.hash || ''}` : `${basePath}/study`} className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-center inline-block">
                      Back to Activities
                    </a>
                  ) : (
                    <Link href={deckId ? `/study?deck=${deckId}` : '/'} className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-center">
                      Home
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Grid - 4x4 */}
        <div className="max-w-4xl mx-auto">
          {/* Translation Cards - Top 2 rows */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {spanishCards.map((card) => {
              const isIncorrect = incorrectCards.has(card.id);
              return (
                <div key={card.id} className="relative aspect-square">
                  <button
                    onClick={() => handleSpanishClick(card.id)}
                    disabled={card.isMatched || selectedSpanish !== null || isIncorrect}
                    className={`absolute inset-0 rounded-xl p-4 border-2 transition-all ${
                      card.isMatched
                        ? 'bg-green-500/50 border-green-500 cursor-not-allowed'
                        : isIncorrect
                        ? 'bg-red-500/50 border-red-500 cursor-not-allowed'
                        : selectedSpanish === card.id
                        ? 'bg-purple-500/50 border-purple-500'
                        : selectedSpanish !== null
                        ? 'bg-white/10 border-white/20 opacity-50 cursor-not-allowed'
                        : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30 cursor-pointer'
                    }`}
                  >
                    <div className="text-center h-full flex items-center justify-center">
                      <span className="text-sm font-medium break-words">{card.text}</span>
                    </div>
                  </button>
                  <PronounceButton
                    text={card.text}
                    languageCode={deck.targetLanguage}
                    className="absolute top-2 left-2 text-xl"
                    label={`Play ${targetLanguageName} pronunciation`}
                  />
                </div>
              );
            })}
          </div>

          {/* English Cards - Bottom 2 rows */}
          <div className="grid grid-cols-4 gap-4">
            {englishCards.map((card) => {
              const isIncorrect = incorrectCards.has(card.id);
              return (
                <div key={card.id} className="relative aspect-square">
                  <button
                    onClick={() => handleEnglishClick(card.id)}
                    disabled={card.isMatched || !selectedSpanish || isIncorrect}
                    className={`absolute inset-0 rounded-xl p-4 border-2 transition-all ${
                      card.isMatched
                        ? 'bg-green-500/50 border-green-500 cursor-not-allowed'
                        : isIncorrect
                        ? 'bg-red-500/50 border-red-500 cursor-not-allowed'
                        : !selectedSpanish
                        ? 'bg-white/10 border-white/20 opacity-50 cursor-not-allowed'
                        : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30 cursor-pointer'
                    }`}
                  >
                    <div className="text-center h-full flex items-center justify-center">
                      <span className="text-sm font-medium break-words">{card.text}</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8 text-center">
          <div className="text-xl text-white/70 mb-2">
            Round {currentRound + 1} of {totalRounds} • Matched: {matchedPairs} / {Math.min(pairsPerRound, deck ? deck.cards.length - currentRound * pairsPerRound : pairsPerRound)}
          </div>
          <div className="w-full max-w-md mx-auto bg-white/10 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(matchedPairs / Math.min(pairsPerRound, deck ? deck.cards.length - currentRound * pairsPerRound : pairsPerRound)) * 100}%` }}
            />
          </div>
        </div>

        {/* Reset Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
          >
            Reset Game
          </button>
        </div>
      </main>
    </div>
  );
}
