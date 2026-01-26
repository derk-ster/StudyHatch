'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import PronounceButton from '@/components/PronounceButton';
import LanguageBadge from '@/components/LanguageBadge';
import { VocabCard } from '@/types/vocab';
import { getDeckById, getProgress, updateProgress } from '@/lib/storage';
import { updateStreakOnStudy } from '@/lib/streak';
import { getLanguageName } from '@/lib/languages';

export default function ScramblePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrambledWord, setScrambledWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);

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
  const targetLanguageCode = deck?.targetLanguage || 'es';

  // Scramble word function
  const scrambleWord = (word: string): string => {
    const letters = word.split('').filter(char => char !== ' ');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.join('');
  };

  useEffect(() => {
    if (currentCard) {
      const scrambled = scrambleWord(currentCard.translation);
      setScrambledWord(scrambled);
      setUserInput('');
      setShowAnswer(false);
      setIsCorrect(null);
      setShowHint(false);
      setHintsUsed(0);
    }
  }, [currentIndex, currentCard]);

  const handleSubmit = () => {
    if (!currentCard || !userInput.trim()) return;

    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedTarget = currentCard.translation.toLowerCase();
    
    const correct = normalizedInput === normalizedTarget;
    
    setIsCorrect(correct);
    setShowAnswer(true);
    
    if (correct) {
      const points = 10 - (hintsUsed * 2);
      setScore(prev => prev + Math.max(1, points));
    }
    
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
      setCurrentIndex(0);
    }
  };

  const handleHint = () => {
    if (!currentCard || showHint) return;
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
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
        {/* Header */}
        <div className="mb-8 bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Word Scramble</h1>
              <p className="text-white/70">Unscramble the {targetLanguageName} word</p>
              {deck && <LanguageBadge languageCode={deck.targetLanguage} />}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">Score: {score}</div>
              <div className="text-sm text-white/70">Card {currentIndex + 1} of {shuffledCards.length}</div>
            </div>
          </div>
        </div>

        {/* Card Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 card-glow min-h-[300px] flex flex-col justify-center items-center mb-8">
          <div className="text-center w-full">
            <div className="text-sm text-white/60 mb-4">English</div>
            <h2 className="text-4xl font-bold mb-8 text-white">
              {currentCard.english}
            </h2>
            
            <div className="mb-8">
              <div className="text-sm text-white/60 mb-2 flex items-center justify-center gap-2">
                <span>Scrambled {targetLanguageName} word:</span>
                <PronounceButton
                  text={currentCard.translation}
                  languageCode={targetLanguageCode}
                  className="text-xl"
                  label={`Play ${targetLanguageName} pronunciation`}
                />
              </div>
              <div className="text-5xl font-bold text-purple-400 mb-4 tracking-wider">
                {scrambledWord}
              </div>
            </div>

            {showHint && (
              <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <div className="text-yellow-400 font-medium">Hint: {currentCard.translation[0]}...</div>
              </div>
            )}

            {!showAnswer && (
              <div className="mt-8">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type the unscrambled word..."
                  className="w-full max-w-md px-6 py-4 rounded-lg bg-white/10 text-white text-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/40 text-center"
                  autoFocus
                />
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
                    Correct answer: <strong className="text-green-400">{currentCard.translation}</strong>
                  </div>
                )}
                {isCorrect && hintsUsed > 0 && (
                  <div className="text-sm text-yellow-400 mt-2">
                    Points earned: {10 - (hintsUsed * 2)} (used {hintsUsed} hint{hintsUsed > 1 ? 's' : ''})
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
            <>
              <button
                onClick={handleHint}
                disabled={showHint}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-all font-medium"
              >
                💡 Hint (-2 pts)
              </button>
              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-all font-medium text-lg"
              >
                Check Answer
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg transition-all font-medium text-lg"
            >
              Next Word →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
