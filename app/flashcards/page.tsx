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

export default function FlashcardsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showTranslationFirst, setShowTranslationFirst] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flashcards_showTranslationFirst');
      return saved !== null ? saved === 'true' : false;
    }
    return false;
  });
  const [showDefinitions, setShowDefinitions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flashcards_showDefinitions');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [progress, setProgress] = useState(getProgress());
  const [markedCards, setMarkedCards] = useState<Set<string>>(new Set());
  const [cardStates, setCardStates] = useState<Map<string, 'known' | 'not-known'>>(new Map());
  const [flashingCard, setFlashingCard] = useState<{id: string, type: 'known' | 'not-known'} | null>(null);
  const [lastClickedCard, setLastClickedCard] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [sessionStarredCards, setSessionStarredCards] = useState<Set<string>>(new Set());
  const [definitions, setDefinitions] = useState<Map<string, string>>(new Map());
  const [loadingDefinitions, setLoadingDefinitions] = useState<Set<string>>(new Set());

  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;

  useEffect(() => {
    if (deckId) {
      updateStreakOnStudy();
    }
  }, [deckId]);
  const targetLanguageName = deck ? getLanguageName(deck.targetLanguage) : 'Translation';
  
  useEffect(() => {
    setProgress(getProgress());
  }, []);

  // Save checkbox preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flashcards_showTranslationFirst', String(showTranslationFirst));
    }
  }, [showTranslationFirst]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flashcards_showDefinitions', String(showDefinitions));
    }
  }, [showDefinitions]);

  // Fetch definition for a word
  const fetchDefinition = async (word: string) => {
    if (!word || definitions.has(word) || loadingDefinitions.has(word)) {
      return;
    }

    setLoadingDefinitions(prev => new Set(prev).add(word));

    try {
      // Clean the word (remove special characters, lowercase)
      const cleanWord = word.trim().toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/)[0];
      
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Get the first definition from the first meaning
          const firstEntry = data[0];
          if (firstEntry.meanings && firstEntry.meanings.length > 0) {
            const firstMeaning = firstEntry.meanings[0];
            if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
              const definition = firstMeaning.definitions[0].definition;
              setDefinitions(prev => new Map(prev).set(word, definition));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching definition:', error);
    } finally {
      setLoadingDefinitions(prev => {
        const newSet = new Set(prev);
        newSet.delete(word);
        return newSet;
      });
    }
  };

  const deckProgress = deckId && progress.deckProgress?.[deckId] ? progress.deckProgress[deckId] : {
    starredCards: [],
    knownCards: [],
    learningCards: [],
    cardStats: {},
    matchBestTime: undefined,
    quizHighScore: undefined,
    quizStreak: 0,
  };

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
    setProgress(newProgress);
  };

  const getCurrentDeckProgress = () => {
    const currentProgress = getProgress();
    const currentDeckProgress = deckId && currentProgress.deckProgress?.[deckId]
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
    return { currentProgress, currentDeckProgress };
  };

  const filteredCards = useMemo(() => {
    if (!deck) return [];
    return [...deck.cards];
  }, [deck]);
    
  useEffect(() => {
    const indices = filteredCards.map((_, i) => i);
    setShuffledIndices(indices);
  }, [deckId, filteredCards.length]);

  const actualIndex = shuffledIndices.length > 0 && shuffledIndices[currentIndex] !== undefined 
    ? shuffledIndices[currentIndex] 
    : currentIndex;
  const currentCard = filteredCards[actualIndex];
  const isStarred = currentCard ? sessionStarredCards.has(currentCard.id) : false;
  const isMarked = currentCard ? markedCards.has(currentCard.id) : false;
  const cardState = currentCard ? cardStates.get(currentCard.id) : null;
  const isCurrentlyFlashing = currentCard && flashingCard?.id === currentCard.id;
  const isLastClicked = currentCard && lastClickedCard === currentCard.id;
  const showKnownColor = (isCurrentlyFlashing && flashingCard?.type === 'known') || 
                         (!isCurrentlyFlashing && !isLastClicked && cardState === 'known');
  const showNotKnownColor = (isCurrentlyFlashing && flashingCard?.type === 'not-known') || 
                            (!isCurrentlyFlashing && !isLastClicked && cardState === 'not-known');

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setMarkedCards(new Set());
    setCardStates(new Map());
    setFlashingCard(null);
    setLastClickedCard(null);
    setShowResults(false);
    setSessionStarredCards(new Set());
  }, [deckId]);

  // Fetch definition when current card changes (always fetch for English word)
  useEffect(() => {
    if (currentCard && currentCard.english) {
      const wordToDefine = currentCard.english;
      if (wordToDefine && !definitions.has(wordToDefine) && !loadingDefinitions.has(wordToDefine)) {
        fetchDefinition(wordToDefine);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualIndex]);

  const calculateResults = useMemo(() => {
    const total = filteredCards.length;
    let known = 0;
    let notKnown = 0;
    let starred = 0;
    let blank = 0;

    filteredCards.forEach(card => {
      const state = cardStates.get(card.id);
      if (state === 'known') {
        known++;
      } else if (state === 'not-known') {
        notKnown++;
      } else {
        blank++;
      }
      
      if (sessionStarredCards.has(card.id)) {
        starred++;
      }
    });

    const correct = known;
    const incorrect = notKnown;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
      total,
      known,
      notKnown,
      correct,
      incorrect,
      blank,
      starred,
      accuracy,
    };
  }, [filteredCards, cardStates, sessionStarredCards]);

  useEffect(() => {
    if (filteredCards.length > 0 && markedCards.size === filteredCards.length) {
      setTimeout(() => {
        setShowResults(true);
      }, 500);
    }
  }, [markedCards.size, filteredCards.length]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (!isMarked) return;
    setLastClickedCard(null);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    setIsFlipped(false);
  };

  const handlePrev = () => {
    setLastClickedCard(null);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    setIsFlipped(false);
  };

  const handleShuffle = () => {
    if (!deck || filteredCards.length === 0) return;

    const currentOrder = shuffledIndices.length > 0
      ? [...shuffledIndices]
      : Array.from({ length: filteredCards.length }, (_, i) => i);

    const remaining = currentOrder.slice(currentIndex);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    const nextOrder = [
      ...currentOrder.slice(0, currentIndex),
      ...remaining,
    ];

    setShuffledIndices(nextOrder);
  };

  const handleStar = () => {
    if (!currentCard || isMarked) return;
    
    setSessionStarredCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentCard.id)) {
        newSet.delete(currentCard.id);
      } else {
        newSet.add(currentCard.id);
      }
      return newSet;
    });

    const { currentDeckProgress } = getCurrentDeckProgress();
    const starredCards = currentDeckProgress.starredCards.includes(currentCard.id)
      ? currentDeckProgress.starredCards.filter(id => id !== currentCard.id)
      : [...currentDeckProgress.starredCards, currentCard.id];
    updateDeckProgress({ starredCards });

    setMarkedCards(prev => new Set(prev).add(currentCard.id));
    
    setTimeout(() => {
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setShowTranslationFirst(false);
      }
    }, 300);
  };

  const handleKnown = () => {
    if (!currentCard || isMarked) return;

    const { currentDeckProgress } = getCurrentDeckProgress();
    const knownCards = currentDeckProgress.knownCards.includes(currentCard.id)
      ? currentDeckProgress.knownCards
      : [...currentDeckProgress.knownCards, currentCard.id];
    const learningCards = currentDeckProgress.learningCards.filter(id => id !== currentCard.id);
    const newStats = { ...currentDeckProgress.cardStats };
    if (!newStats[currentCard.id]) {
      newStats[currentCard.id] = { correct: 0, incorrect: 0 };
    }
    newStats[currentCard.id].correct++;
    newStats[currentCard.id].lastSeen = Date.now();
    updateDeckProgress({ knownCards, learningCards, cardStats: newStats });

    if (session && !session.isGuest) {
      updateLeaderboardsForUser({ points: 4 });
    }

    setCardStates(prev => new Map(prev).set(currentCard.id, 'known'));
    setMarkedCards(prev => new Set(prev).add(currentCard.id));
    setFlashingCard({ id: currentCard.id, type: 'known' });
    setLastClickedCard(currentCard.id);
    
    setTimeout(() => {
      setFlashingCard(null);
    }, 500);
    
    setTimeout(() => {
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setShowTranslationFirst(false);
      }
    }, 300);
  };

  const handleNotKnown = () => {
    if (!currentCard || isMarked) return;

    const { currentDeckProgress } = getCurrentDeckProgress();
    const learningCards = currentDeckProgress.learningCards.includes(currentCard.id)
      ? currentDeckProgress.learningCards
      : [...currentDeckProgress.learningCards, currentCard.id];
    const knownCards = currentDeckProgress.knownCards.filter(id => id !== currentCard.id);
    const newStats = { ...currentDeckProgress.cardStats };
    if (!newStats[currentCard.id]) {
      newStats[currentCard.id] = { correct: 0, incorrect: 0 };
    }
    newStats[currentCard.id].incorrect++;
    newStats[currentCard.id].lastSeen = Date.now();
    updateDeckProgress({ knownCards, learningCards, cardStats: newStats });

    if (session && !session.isGuest) {
      updateLeaderboardsForUser({ points: 1 });
    }

    setCardStates(prev => new Map(prev).set(currentCard.id, 'not-known'));
    setMarkedCards(prev => new Set(prev).add(currentCard.id));
    setFlashingCard({ id: currentCard.id, type: 'not-known' });
    setLastClickedCard(currentCard.id);
    
    setTimeout(() => {
      setFlashingCard(null);
    }, 500);
    
    setTimeout(() => {
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
        setShowTranslationFirst(false);
      }
    }, 300);
  };

  if (!deck || filteredCards.length === 0) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-xl text-white/70">No cards found. Try adjusting your filters.</p>
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
      <main className="max-w-4xl mx-auto px-4 py-12" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="mb-8 bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Flashcards</h1>
              <p className="text-white/70">Card {currentIndex + 1} of {filteredCards.length}</p>
              {deck && <LanguageBadge languageCode={deck.targetLanguage} />}
            </div>
            <button
              onClick={() => {
                if (deckId) {
                  router.push(`/study?deck=${deckId}`);
                } else {
                  router.push('/');
                }
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm font-medium"
              style={{ position: 'relative', zIndex: 10 }}
            >
              ← Back to Activities
            </button>
          </div>
          <div className="flex flex-wrap gap-4 items-center relative z-10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDefinitions}
                onChange={(e) => {
                  e.stopPropagation();
                  setShowDefinitions(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm cursor-pointer">Show Definitions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTranslationFirst}
                onChange={(e) => {
                  e.stopPropagation();
                  setShowTranslationFirst(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm cursor-pointer">{targetLanguageName} First</span>
            </label>
            <button
              onClick={handleShuffle}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm cursor-pointer"
              type="button"
            >
              🔀 Shuffle
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="relative mb-8 w-full max-w-2xl mx-auto z-10">
          <div
            className={`flip-card bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow min-h-[500px] h-[500px] cursor-pointer ${
              isFlipped ? 'flipped' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleFlip();
            }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <div className="flip-card-inner h-full">
              <div className="flip-card-front text-center relative p-12">
                <div className="absolute top-4 right-4 text-white/40 text-sm">
                  {currentIndex + 1} / {filteredCards.length}
                </div>
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="text-sm text-white/60">
                    {showTranslationFirst ? targetLanguageName : 'English'}
                  </div>
                  <h2 className="text-5xl font-bold text-white text-center">
                    {showTranslationFirst ? currentCard.translation : currentCard.english}
                  </h2>
                  {/* Definition under English words */}
                  {!showTranslationFirst && showDefinitions && (
                    <div className="mt-2 px-4 py-2 bg-white/5 rounded-lg max-w-md">
                      <div className="text-xs text-white/50 mb-1">Definition</div>
                      <p className="text-white/80 text-base">
                        {(() => {
                          const wordToDefine = currentCard.english;
                          const definition = definitions.get(wordToDefine);
                          if (definition) {
                            return definition;
                          }
                          if (loadingDefinitions.has(wordToDefine)) {
                            return 'Loading definition...';
                          }
                          return currentCard.notes || wordToDefine;
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flip-card-back text-center relative p-12">
                <div className="absolute top-4 right-4 text-white/40 text-sm">
                  {currentIndex + 1} / {filteredCards.length}
                </div>
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="text-sm text-white/60">
                    {showTranslationFirst ? 'English' : targetLanguageName}
                  </div>
                  <h2 className="text-5xl font-bold text-white text-center">
                    {showTranslationFirst ? currentCard.english : currentCard.translation}
                  </h2>
                  {/* Definition under English words on back */}
                  {showTranslationFirst && showDefinitions && (
                    <div className="mt-2 px-4 py-2 bg-white/5 rounded-lg max-w-md">
                      <div className="text-xs text-white/50 mb-1">Definition</div>
                      <p className="text-white/80 text-base">
                        {(() => {
                          const wordToDefine = currentCard.english;
                          const definition = definitions.get(wordToDefine);
                          if (definition) {
                            return definition;
                          }
                          if (loadingDefinitions.has(wordToDefine)) {
                            return 'Loading definition...';
                          }
                          return currentCard.notes || wordToDefine;
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-center mt-4 text-white/60 text-sm">
            Click card to flip
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex flex-wrap gap-4 justify-center mb-6 relative z-10">
          <button
            onClick={handleStar}
            disabled={isMarked}
            className={`px-6 py-3 rounded-lg transition-all font-medium ${
              isMarked
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : isStarred
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {isStarred ? '⭐ Starred' : '☆ Star'}
          </button>
          <button
            onClick={handleKnown}
            disabled={isMarked}
            className={`px-6 py-3 rounded-lg transition-all font-medium ${
              isMarked
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : showKnownColor
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {cardState === 'known' ? '✓ Known' : 'Mark Known'}
          </button>
          <button
            onClick={handleNotKnown}
            disabled={isMarked}
            className={`px-6 py-3 rounded-lg transition-all font-medium ${
              isMarked
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : showNotKnownColor
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {cardState === 'not-known' ? 'Not Known' : 'Mark Not Known'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center relative z-10">
          <button
            onClick={handlePrev}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-medium"
          >
            ← Previous
          </button>
          <button
            onClick={handleFlip}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all font-medium"
          >
            {isFlipped ? 'Show Front' : 'Flip Card'}
          </button>
          <button
            onClick={handleNext}
            disabled={!isMarked}
            className={`px-6 py-3 rounded-lg transition-all font-medium ${
              isMarked
                ? 'bg-white/10 hover:bg-white/20'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            Next →
          </button>
        </div>
      </main>

        {/* Results Modal */}
        {showResults && (
          <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setShowResults(false)}
          style={{ zIndex: 9999 }}
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
                <div className="text-white/70 text-sm mb-2">Known (Correct)</div>
                <div className="text-3xl font-bold text-green-400">
                  {calculateResults.known}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {calculateResults.total > 0 ? Math.round((calculateResults.known / calculateResults.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                <div className="text-white/70 text-sm mb-2">Not Known (Incorrect)</div>
                <div className="text-3xl font-bold text-red-400">
                  {calculateResults.notKnown}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {calculateResults.total > 0 ? Math.round((calculateResults.notKnown / calculateResults.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/70 text-sm mb-2">Left Blank</div>
                <div className="text-3xl font-bold text-white/60">
                  {calculateResults.blank}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {calculateResults.total > 0 ? Math.round((calculateResults.blank / calculateResults.total) * 100) : 0}%
                </div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
                <div className="text-white/70 text-sm mb-2">Starred</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {calculateResults.starred}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  {calculateResults.total > 0 ? Math.round((calculateResults.starred / calculateResults.total) * 100) : 0}%
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
                  setIsFlipped(false);
                  setMarkedCards(new Set());
                  setCardStates(new Map());
                  setFlashingCard(null);
                  setLastClickedCard(null);
                  setSessionStarredCards(new Set());
                }}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all font-medium"
              >
                Study Again
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
