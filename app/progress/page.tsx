'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { getProgress, resetProgress, getAllDecks, getDeckById } from '@/lib/storage';

export default function ProgressPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const progress = getProgress();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const decks = getAllDecks();

  useEffect(() => {
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      setSelectedDeckId(deckParam);
    } else if (decks.length > 0) {
      setSelectedDeckId(decks[0].id);
    }
  }, [searchParams, decks]);

  const selectedDeck = selectedDeckId ? getDeckById(selectedDeckId) : null;
  const deckProgress = selectedDeckId && progress.deckProgress?.[selectedDeckId] ? progress.deckProgress[selectedDeckId] : {
    starredCards: [],
    knownCards: [],
    learningCards: [],
    cardStats: {},
    matchBestTime: undefined,
    quizHighScore: undefined,
    quizStreak: 0,
  };

  const totalCards = selectedDeck ? selectedDeck.cards.length : 0;
  const learnedPercentage = totalCards > 0 ? Math.round((deckProgress.knownCards.length / totalCards) * 100) : 0;

  const handleReset = () => {
    resetProgress();
    setShowResetConfirm(false);
    router.push('/');
  };

  // Calculate accuracy from card stats
  const totalAttempts = Object.values(deckProgress.cardStats).reduce(
    (sum, stat) => sum + stat.correct + stat.incorrect,
    0
  );
  const totalCorrect = Object.values(deckProgress.cardStats).reduce(
    (sum, stat) => sum + stat.correct,
    0
  );
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Your Progress
          </h1>
          <p className="text-xl text-white/70">Track your learning journey</p>
        </div>

        {/* Deck Selector */}
        {decks.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-white/90 mb-2">
              Select Deck
            </label>
            <select
              value={selectedDeckId || ''}
              onChange={(e) => {
                setSelectedDeckId(e.target.value);
                router.push(`/progress?deck=${e.target.value}`);
              }}
              className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {decks.map(deck => (
                <option key={deck.id} value={deck.id} className="bg-gray-800">
                  {deck.name} ({deck.cards.length} cards)
                </option>
              ))}
            </select>
          </div>
        )}

        {!selectedDeck ? (
          <div className="text-center py-12">
            <p className="text-xl text-white/70">No deck selected. Create a deck to start tracking progress!</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow">
                <div className="text-white/70 text-sm mb-2">Words Learned</div>
                <div className="text-4xl font-bold text-purple-400 mb-2">
                  {deckProgress.knownCards.length}
                </div>
                <div className="text-sm text-white/60">
                  {learnedPercentage}% of all words
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow">
                <div className="text-white/70 text-sm mb-2">Starred Words</div>
                <div className="text-4xl font-bold text-yellow-400 mb-2">
                  {deckProgress.starredCards.length}
                </div>
                <div className="text-sm text-white/60">
                  Your favorites
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow">
                <div className="text-white/70 text-sm mb-2">Overall Accuracy</div>
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {accuracy}%
                </div>
                <div className="text-sm text-white/60">
                  {totalCorrect} / {totalAttempts} correct
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow">
                <div className="text-white/70 text-sm mb-2">Current Streak</div>
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  {deckProgress.quizStreak || 0}
                </div>
                <div className="text-sm text-white/60">
                  Consecutive correct
                </div>
              </div>
            </div>

        {/* Game Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow">
                <h2 className="text-2xl font-bold mb-4">Quiz Mode</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70">High Score</span>
                    <span className="text-xl font-bold text-purple-400">
                      {deckProgress.quizHighScore || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow">
                <h2 className="text-2xl font-bold mb-4">Match Game</h2>
                <div className="space-y-3">
                  {deckProgress.matchBestTime ? (
                    <div className="flex justify-between">
                      <span className="text-white/70">Best Time</span>
                      <span className="text-xl font-bold text-indigo-400">
                        {Math.floor(deckProgress.matchBestTime / 60)}:{(deckProgress.matchBestTime % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-white/60">No best time yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Learning Status */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 card-glow mb-8">
              <h2 className="text-2xl font-bold mb-4">Learning Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-white/70 text-sm mb-2">Known Words</div>
                  <div className="text-2xl font-bold text-green-400">
                    {deckProgress.knownCards.length}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-2">Still Learning</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {deckProgress.learningCards.length}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-2">Total Practice</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {Object.keys(deckProgress.cardStats).length}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all font-medium"
          >
            Reset All Progress
          </button>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up">
              <h2 className="text-2xl font-bold mb-4">Reset Progress?</h2>
              <p className="text-white/70 mb-6">
                This will permanently delete all your progress, including learned words, scores, and statistics. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                >
                  Reset Progress
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
