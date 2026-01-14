'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { VocabCard } from '@/types/vocab';
import { getDeckById, getProgress, updateProgress } from '@/lib/storage';
import { getLanguageName } from '@/lib/languages';

type CardState = {
  id: string;
  text: string;
  isSpanish: boolean;
  isMatched: boolean;
  cardId: string; // Original card ID for matching
};

export default function MatchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [spanishCards, setSpanishCards] = useState<CardState[]>([]);
  const [englishCards, setEnglishCards] = useState<CardState[]>([]);
  const [selectedSpanish, setSelectedSpanish] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [incorrectCards, setIncorrectCards] = useState<Set<string>>(new Set());

  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;
  const progress = getProgress();
  const targetLanguageName = deck ? getLanguageName(deck.targetLanguage) : 'Translation';

  // Get per-deck progress
  const deckProgress = deckId && progress.deckProgress?.[deckId] ? progress.deckProgress[deckId] : {
    matchBestTime: undefined,
  };

  // Helper to update per-deck progress
  const updateDeckProgress = (updates: Partial<typeof deckProgress>) => {
    if (!deckId) return;
    const newProgress = { ...progress };
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

  useEffect(() => {
    if (!deck) return;

    // Select up to 8 pairs (16 cards total) or all cards if less than 8
    const maxPairs = Math.min(8, Math.floor(deck.cards.length));
    const selectedCards = deck.cards.slice(0, maxPairs);
    
    // Create translation cards (top 2 rows)
    const translation: CardState[] = selectedCards.map(card => ({
      id: `${card.id}-translation`,
      text: card.translation,
      isSpanish: true,
      isMatched: false,
      cardId: card.id,
    }));
    
    // Shuffle translation cards
    const shuffledTranslation = translation.sort(() => Math.random() - 0.5);
    
    // Create English cards (bottom 2 rows)
    const english: CardState[] = selectedCards.map(card => ({
      id: `${card.id}-english`,
      text: card.english,
      isSpanish: false,
      isMatched: false,
      cardId: card.id,
    }));
    
    // Shuffle English cards
    const shuffledEnglish = english.sort(() => Math.random() - 0.5);
    
    setSpanishCards(shuffledTranslation);
    setEnglishCards(shuffledEnglish);
    setSelectedSpanish(null);
    setMatchedPairs(0);
    setGameComplete(false);
    setStartTime(null);
    setElapsedTime(0);
    setIncorrectCards(new Set());
  }, [deckId]);

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
      setSpanishCards(prev => prev.map(c => 
        c.id === selectedSpanish ? { ...c, isMatched: true } : c
      ));
      setEnglishCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, isMatched: true } : c
      ));
      
      setMatchedPairs(prev => {
        const newCount = prev + 1;
        const totalPairs = Math.min(8, deck ? Math.floor(deck.cards.length) : 8);
        if (newCount === totalPairs) {
          setGameComplete(true);
          const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
          if (!deckProgress.matchBestTime || finalTime < deckProgress.matchBestTime) {
            updateDeckProgress({ matchBestTime: finalTime });
          }
        }
        return newCount;
      });
      
      // Reset selection immediately for correct match
      setSelectedSpanish(null);
    } else {
      // Wrong match - show red feedback
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
    
    // Select up to 8 pairs (16 cards total) or all cards if less than 8
    const maxPairs = Math.min(8, Math.floor(deck.cards.length));
    const selectedCards = deck.cards.slice(0, maxPairs);
    
    const translation: CardState[] = selectedCards.map(card => ({
      id: `${card.id}-translation`,
      text: card.translation,
      isSpanish: true,
      isMatched: false,
      cardId: card.id,
    }));
    
    const shuffledTranslation = translation.sort(() => Math.random() - 0.5);
    
    const english: CardState[] = selectedCards.map(card => ({
      id: `${card.id}-english`,
      text: card.english,
      isSpanish: false,
      isMatched: false,
      cardId: card.id,
    }));
    
    const shuffledEnglish = english.sort(() => Math.random() - 0.5);
    
    setSpanishCards(shuffledTranslation);
    setEnglishCards(shuffledEnglish);
    setSelectedSpanish(null);
    setMatchedPairs(0);
    setGameComplete(false);
    setStartTime(null);
    setElapsedTime(0);
    setIncorrectCards(new Set());
  };

  if (!deck) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-xl text-white/70">Deck not found.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
            >
              Go Home
            </button>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Match Game</h1>
              <p className="text-white/70">Match {targetLanguageName} words with their English translations</p>
              {deck && <LanguageBadge languageCode={deck.targetLanguage} />}
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold mb-4">Congratulations!</h2>
                <p className="text-xl text-white/70 mb-2">You completed the game in</p>
                <p className="text-4xl font-bold text-purple-400 mb-6">{formatTime(elapsedTime)}</p>
                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    Home
                  </button>
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
                <button
                  key={card.id}
                  onClick={() => handleSpanishClick(card.id)}
                  disabled={card.isMatched || selectedSpanish !== null || isIncorrect}
                  className={`aspect-square rounded-xl p-4 border-2 transition-all ${
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
              );
            })}
          </div>

          {/* English Cards - Bottom 2 rows */}
          <div className="grid grid-cols-4 gap-4">
            {englishCards.map((card) => {
              const isIncorrect = incorrectCards.has(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => handleEnglishClick(card.id)}
                  disabled={card.isMatched || !selectedSpanish || isIncorrect}
                  className={`aspect-square rounded-xl p-4 border-2 transition-all ${
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
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8 text-center">
          <div className="text-xl text-white/70 mb-2">
            Matched: {matchedPairs} / {Math.min(8, deck ? Math.floor(deck.cards.length) : 8)}
          </div>
          <div className="w-full max-w-md mx-auto bg-white/10 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(matchedPairs / Math.min(8, deck ? Math.floor(deck.cards.length) : 8)) * 100}%` }}
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
