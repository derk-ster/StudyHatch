'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { VocabCard } from '@/types/vocab';
import { getDeckById, getProgress, updateProgress } from '@/lib/storage';
import { updateStreakOnStudy } from '@/lib/streak';
import { getLanguageName } from '@/lib/languages';
import { useAuth } from '@/lib/auth-context';
import { updateLeaderboardsForUser } from '@/lib/leaderboard-client';

export default function QuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [missedWords, setMissedWords] = useState<VocabCard[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [showTranslationFirst, setShowTranslationFirst] = useState(true);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;

  useEffect(() => {
    if (deckId) {
      updateStreakOnStudy();
    }
  }, [deck]);
  const progress = getProgress();
  const targetLanguageName = deck ? getLanguageName(deck.targetLanguage) : 'Translation';

  // Get per-deck progress
  const deckProgress = deckId && progress.deckProgress?.[deckId] ? progress.deckProgress[deckId] : {
    quizHighScore: undefined,
    quizStreak: 0,
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

  // Shuffle and select 10 cards for quiz
  const quizCards = useMemo(() => {
    if (!deck) return [];
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [deckId]);

  const currentCard = quizCards[currentIndex];

  // Generate options for current question - store in state so they don't change when answer is clicked
  useEffect(() => {
    if (!currentCard || !deck) {
      setCurrentOptions([]);
      return;
    }
    
    const correctAnswer = showTranslationFirst ? currentCard.english : currentCard.translation;
    const wrongAnswers = deck.cards
      .filter(card => card.id !== currentCard.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(card => showTranslationFirst ? card.english : card.translation);
    
    const allOptions = [correctAnswer, ...wrongAnswers];
    const shuffled = [...allOptions].sort(() => Math.random() - 0.5);
    setCurrentOptions(shuffled);
  }, [currentIndex, showTranslationFirst, deck, currentCard]);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
  }, [currentIndex]);

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!currentCard || selectedAnswer === null) return;

    const correctAnswer = showTranslationFirst ? currentCard.english : currentCard.translation;
    const isCorrect = selectedAnswer === correctAnswer;

    setShowResult(true);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      // Update per-deck card stats
      const currentDeckProgress = getCurrentDeckProgress();
      const newStats = { ...currentDeckProgress.cardStats };
      if (!newStats[currentCard.id]) {
        newStats[currentCard.id] = { correct: 0, incorrect: 0 };
      }
      newStats[currentCard.id].correct++;
      newStats[currentCard.id].lastSeen = Date.now();
      updateDeckProgress({ cardStats: newStats });
    } else {
      setStreak(0);
      setMissedWords(prev => [...prev, currentCard]);
      // Update per-deck card stats
      const currentDeckProgress = getCurrentDeckProgress();
      const newStats = { ...currentDeckProgress.cardStats };
      if (!newStats[currentCard.id]) {
        newStats[currentCard.id] = { correct: 0, incorrect: 0 };
      }
      newStats[currentCard.id].incorrect++;
      newStats[currentCard.id].lastSeen = Date.now();
      updateDeckProgress({ cardStats: newStats });
    }

    if (session && !session.isGuest) {
      updateLeaderboardsForUser({
        points: isCorrect ? 10 : 0,
        quizResult: { correct: isCorrect },
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < quizCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Quiz complete
      setQuizComplete(true);
      const finalScore = score + (selectedAnswer === (showTranslationFirst ? currentCard?.english : currentCard?.translation) ? 1 : 0);
      
      const currentDeckProgress = getCurrentDeckProgress();
      if (!currentDeckProgress.quizHighScore || finalScore > currentDeckProgress.quizHighScore) {
        updateDeckProgress({ quizHighScore: finalScore });
      }
      
      if (streak > (currentDeckProgress.quizStreak || 0)) {
        updateDeckProgress({ quizStreak: streak });
      }
    }
  };

  if (!deck || quizCards.length === 0) {
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

  const correctAnswer = currentCard ? (showTranslationFirst ? currentCard.english : currentCard.translation) : '';

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Quiz Mode</h1>
              <p className="text-white/70">Question {currentIndex + 1} of {quizCards.length}</p>
              {deck && <LanguageBadge languageCode={deck.targetLanguage} />}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">Score: {score}</div>
              <div className="text-sm text-white/70">Streak: {streak}</div>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTranslationFirst}
              onChange={(e) => setShowTranslationFirst(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">{targetLanguageName} → English</span>
          </label>
        </div>

        {/* Quiz Complete Modal */}
        {quizComplete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-white/20 card-glow animate-slide-up">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
                <p className="text-2xl text-purple-400 mb-2">
                  Score: {score} / {quizCards.length}
                </p>
                <p className="text-white/70">
                  Accuracy: {Math.round((score / quizCards.length) * 100)}%
                </p>
              </div>

              {missedWords.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-4">Review Missed Words:</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {missedWords.map((card) => (
                      <div key={card.id} className="bg-white/5 rounded-lg p-4">
                        <div className="font-bold">{card.translation}</div>
                        <div className="text-white/70">{card.english}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setScore(0);
                    setStreak(0);
                    setMissedWords([]);
                    setQuizComplete(false);
                    setSelectedAnswer(null);
                    setShowResult(false);
                  }}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                >
                  Try Again
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
        )}

        {/* Question */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 card-glow mb-8">
          <div className="text-center">
            <div className="text-sm text-white/60 mb-4">
              {showTranslationFirst ? targetLanguageName : 'English'}
            </div>
            <h2 className="text-5xl font-bold mb-8 text-white">
              {currentCard ? (showTranslationFirst ? currentCard.translation : currentCard.english) : ''}
            </h2>
            <p className="text-white/70">Select the correct translation:</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-8">
          {currentOptions.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === correctAnswer;
            const showCorrect = showResult && isCorrectOption;
            const showIncorrect = showResult && isSelected && !isCorrectOption;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={showResult}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  showCorrect
                    ? 'bg-green-500/30 border-green-500'
                    : showIncorrect
                    ? 'bg-red-500/30 border-red-500 animate-shake'
                    : isSelected
                    ? 'bg-purple-600/30 border-purple-500'
                    : 'bg-white/10 border-white/20 hover:bg-white/15'
                } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-medium">{option}</span>
                  {showCorrect && <span className="text-2xl">✓</span>}
                  {showIncorrect && <span className="text-2xl">✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg transition-all font-medium text-lg"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg transition-all font-medium text-lg"
            >
              {currentIndex < quizCards.length - 1 ? 'Next Question →' : 'View Results'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
