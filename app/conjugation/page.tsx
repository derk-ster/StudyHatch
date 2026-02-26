'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { getGrammarDeckById } from '@/lib/storage';
import type { GrammarCard } from '@/types/vocab';
import { fuzzyMatch } from '@/lib/storage';
import { playSfx } from '@/lib/sfx';

export default function ConjugationPage() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deck');
  const [deck, setDeck] = useState<ReturnType<typeof getGrammarDeckById>>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctForm, setCorrectForm] = useState('');
  const [sessionResults, setSessionResults] = useState<Map<string, boolean>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [retryCards, setRetryCards] = useState<GrammarCard[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (deckId) {
      setDeck(getGrammarDeckById(deckId));
    } else {
      setDeck(undefined);
    }
    setCurrentIndex(0);
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setSessionResults(new Map());
    setShowResults(false);
    setRetryCards(null);
  }, [deckId]);

  const cards = deck?.cards ?? [];
  const shuffledCards = useMemo(() => {
    if (cards.length === 0) return [];
    return [...cards].sort(() => Math.random() - 0.5);
  }, [deckId, cards.length]);

  const effectiveCards = retryCards && retryCards.length > 0 ? retryCards : shuffledCards;
  const currentCard = effectiveCards[currentIndex];

  useEffect(() => {
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setCorrectForm('');
    inputRef.current?.focus();
  }, [currentIndex]);

  useEffect(() => {
    if (showAnswer) return;
    inputRef.current?.focus();
  }, [showAnswer]);

  const handleSubmit = () => {
    if (!currentCard || !userInput.trim()) return;
    const correct = fuzzyMatch(userInput.trim(), currentCard.answer);
    setIsCorrect(correct);
    setShowAnswer(true);
    setCorrectForm(currentCard.answer);
    playSfx(correct ? 'correct' : 'incorrect');
    setSessionResults(prev => new Map(prev).set(currentCard.id, correct));
  };

  const handleNext = () => {
    if (currentIndex < effectiveCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const missedCards = useMemo(
    () => effectiveCards.filter((c) => sessionResults.get(c.id) === false),
    [effectiveCards, sessionResults]
  );

  const correctCount = Array.from(sessionResults.values()).filter(Boolean).length;
  const totalCount = sessionResults.size;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  if (deck === undefined) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center text-white/80">
          Loading...
        </main>
      </div>
    );
  }

  if (!deck || effectiveCards.length === 0) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-white/80 mb-4">Deck not found or has no cards.</p>
          <Link href="/grammar-decks" className="text-amber-400 hover:underline">
            ← Back to Grammar Decks
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link href="/grammar-decks" className="text-amber-400 hover:underline text-sm">
            ← {deck.name}
          </Link>
          <span className="text-white/60 text-sm">
            {currentIndex + 1} / {effectiveCards.length}
          </span>
        </div>

        {!showResults ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 card-glow">
            <p className="text-amber-200/90 text-sm uppercase tracking-wider mb-2">
              {currentCard.tense.replace(/-/g, ' ')} • {currentCard.person}
            </p>
            <h2 className="text-4xl font-bold text-white mb-2">
              {currentCard.infinitive}
            </h2>
            {currentCard.translation && (
              <p className="text-white/60 text-lg mb-6">({currentCard.translation})</p>
            )}
            {!currentCard.translation && <div className="mb-6" />}

            {!showAnswer ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Type the conjugation..."
                  className="w-full px-4 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white text-xl placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!userInput.trim()}
                  className="mt-4 w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  Check
                </button>
              </>
            ) : (
              <>
                <div
                  className={`w-full px-4 py-4 rounded-xl border-2 text-xl ${
                    isCorrect
                      ? 'bg-green-500/20 border-green-500/50 text-green-200'
                      : 'bg-red-500/20 border-red-500/50 text-red-200'
                  }`}
                >
                  {isCorrect ? '✓ Correct!' : `Correct: ${correctForm}`}
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-4 w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
                >
                  {currentIndex < effectiveCards.length - 1 ? 'Next' : 'See results'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 card-glow text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Session complete</h2>
            <p className="text-white/80 text-lg mb-6">
              {correctCount} / {totalCount} correct ({accuracy}%)
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {missedCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const shuffled = [...missedCards].sort(() => Math.random() - 0.5);
                    setRetryCards(shuffled);
                    setCurrentIndex(0);
                    setSessionResults(new Map());
                    setShowResults(false);
                    setUserInput('');
                    setShowAnswer(false);
                  }}
                  className="px-6 py-3 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/40 text-white font-semibold"
                >
                  Redo missed ({missedCards.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setRetryCards(null);
                  setCurrentIndex(0);
                  setSessionResults(new Map());
                  setShowResults(false);
                  setUserInput('');
                  setShowAnswer(false);
                }}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                Practice again
              </button>
              <Link
                href="/grammar-decks"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20"
              >
                Back to Grammar Decks
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
