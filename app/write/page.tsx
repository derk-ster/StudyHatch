'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { VocabCard } from '@/types/vocab';
import { getDeckById, getProgress, updateProgress, normalizeText, fuzzyMatch } from '@/lib/storage';
import { updateStreakOnStudy } from '@/lib/streak';
import { getLanguageName } from '@/lib/languages';

export default function WritePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showTranslationFirst, setShowTranslationFirst] = useState(false); // Default: English → Translation
  const [correctForm, setCorrectForm] = useState('');
  const [sessionResults, setSessionResults] = useState<Map<string, boolean>>(new Map());
  const [showResults, setShowResults] = useState(false);

  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;

  useEffect(() => {
    if (deckId) {
      updateStreakOnStudy();
    }
  }, [deckId]);
  const progress = getProgress();
  const targetLanguageName = deck ? getLanguageName(deck.targetLanguage) : 'Translation';

  // Get per-deck progress
  const deckProgress = deckId && progress.deckProgress?.[deckId] ? progress.deckProgress[deckId] : {
    cardStats: {},
  };

  // Helper to update per-deck progress
  const updateDeckProgress = (updates: Partial<typeof deckProgress>) => {
    if (!deckId) return;
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

  // Shuffle cards
  const shuffledCards = useMemo(() => {
    if (!deck) return [];
    return [...deck.cards].sort(() => Math.random() - 0.5);
  }, [deckId]);

  const currentCard = shuffledCards[currentIndex];

  useEffect(() => {
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setCorrectForm('');
  }, [currentIndex, showTranslationFirst]);

  useEffect(() => {
    setSessionResults(new Map());
    setShowResults(false);
  }, [deckId]);

  // Calculate results
  const calculateResults = useMemo(() => {
    const total = sessionResults.size;
    let correct = 0;
    let incorrect = 0;
    
    sessionResults.forEach((result) => {
      if (result) {
        correct++;
      } else {
        incorrect++;
      }
    });
    
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return {
      total,
      correct,
      incorrect,
      accuracy,
    };
  }, [sessionResults]);

  const handleSubmit = () => {
    if (!currentCard || !userInput.trim()) return;

    const target = showTranslationFirst ? currentCard.english : currentCard.translation;
    const normalizedInput = normalizeText(userInput);
    const normalizedTarget = normalizeText(target);
    
    // Check if correct (accent-insensitive)
    const correct = normalizedInput === normalizedTarget || fuzzyMatch(userInput, target);
    
    setIsCorrect(correct);
    setShowAnswer(true);
    setCorrectForm(target); // Store correct form with accents
    
    // Track session results
    setSessionResults(prev => new Map(prev).set(currentCard.id, correct));
    
    // Update per-deck card stats
    const currentDeckProgress = getCurrentDeckProgress();
    const newStats = { ...currentDeckProgress.cardStats };
    if (!newStats[currentCard.id]) {
      newStats[currentCard.id] = { correct: 0, incorrect: 0 };
    }
    if (correct) {
      newStats[currentCard.id].correct++;
    } else {
      newStats[currentCard.id].incorrect++;
    }
    newStats[currentCard.id].lastSeen = Date.now();
    updateDeckProgress({ cardStats: newStats });
  };

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All cards completed, show results
      setShowResults(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showAnswer) {
      handleSubmit();
    } else if (e.key === 'Enter' && showAnswer) {
      handleNext();
    }
  };

  if (!deck || shuffledCards.length === 0) {
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

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="mb-6 bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTranslationFirst}
                onChange={(e) => setShowTranslationFirst(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">{targetLanguageName} → English</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="text-sm text-white/70">
                Card {currentIndex + 1} of {shuffledCards.length}
              </div>
              {deck && <LanguageBadge languageCode={deck.targetLanguage} />}
            </div>
          </div>
        </div>

        {/* Card Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 card-glow min-h-[300px] flex flex-col justify-center items-center mb-8">
          <div className="text-center w-full">
            <div className="text-sm text-white/60 mb-4">
              {showTranslationFirst ? targetLanguageName : 'English'}
            </div>
            <h2 className="text-5xl font-bold mb-8 text-white">
              {currentCard ? (showTranslationFirst ? currentCard.translation : currentCard.english) : ''}
            </h2>
            
            {!showAnswer && (
              <div className="mt-8">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Type the ${showTranslationFirst ? 'English' : targetLanguageName} translation...`}
                  className="w-full max-w-md px-6 py-4 rounded-lg bg-white/10 text-white text-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/40"
                  autoFocus
                />
                <p className="text-sm text-white/50 mt-2">
                  Accents are optional - we&apos;ll check your answer regardless
                </p>
              </div>
            )}

            {showAnswer && (
              <div className={`mt-8 p-6 rounded-lg ${
                isCorrect ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'
              }`}>
                <div className={`text-2xl font-bold mb-2 ${
                  isCorrect ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isCorrect ? '¡Correcto! 🎉' : 'Incorrecto'}
                </div>
                {!isCorrect && (
                  <div className="text-xl text-white/90 mt-4">
                    <div>Your answer: <strong>{userInput}</strong></div>
                    <div className="mt-2">Correct answer: <strong className="text-green-400">{correctForm}</strong></div>
                    {normalizeText(userInput) === normalizeText(correctForm) && (
                      <div className="text-sm text-yellow-400 mt-2">
                        ⚠️ You had the right letters but missed the accents!
                      </div>
                    )}
                  </div>
                )}
                {currentCard.example && (
                  <div className="mt-4 text-white/70 italic">
                    Example: {currentCard.example}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          {!showAnswer ? (
            <button
              onClick={handleSubmit}
              disabled={!userInput.trim()}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-all font-medium text-lg"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg transition-all font-medium text-lg"
            >
              {currentIndex < shuffledCards.length - 1 ? 'Next Card →' : 'View Results'}
            </button>
          )}
        </div>
      </main>

      {/* Results Modal */}
      {showResults && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
          onClick={() => setShowResults(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-white/20 card-glow animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Session Complete!
              </h2>
              <p className="text-white/70">Here&apos;s how you did</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/70 text-sm mb-2">Total Cards</div>
                <div className="text-3xl font-bold text-white">
                  {calculateResults.total}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/70 text-sm mb-2">Accuracy</div>
                <div className="text-3xl font-bold text-purple-400">
                  {calculateResults.accuracy}%
                </div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <div className="text-white/70 text-sm mb-2">Correct</div>
                <div className="text-3xl font-bold text-green-400">
                  {calculateResults.correct}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {calculateResults.total > 0 ? Math.round((calculateResults.correct / calculateResults.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                <div className="text-white/70 text-sm mb-2">Incorrect</div>
                <div className="text-3xl font-bold text-red-400">
                  {calculateResults.incorrect}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {calculateResults.total > 0 ? Math.round((calculateResults.incorrect / calculateResults.total) * 100) : 0}%
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="text-center">
                <div className="text-white/70 text-sm mb-2">Score</div>
                <div className="text-4xl font-bold text-purple-400">
                  {calculateResults.correct} / {calculateResults.total}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowResults(false);
                  setCurrentIndex(0);
                  setSessionResults(new Map());
                }}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all font-medium"
              >
                Practice Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-medium"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
