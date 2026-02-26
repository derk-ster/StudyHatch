'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { GrammarDeck } from '@/types/vocab';
import { getAllGrammarDecks, deleteGrammarDeck } from '@/lib/storage';
import LanguageBadge from '@/components/LanguageBadge';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GrammarDecksPage() {
  const [decks, setDecks] = useState<GrammarDeck[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setDecks(getAllGrammarDecks());
  }, []);

  const handleDelete = (deckId: string) => {
    deleteGrammarDeck(deckId);
    setDecks(getAllGrammarDecks());
    setDeleteConfirmId(null);
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
            Practice Grammar and Pronunciation
          </h1>
          <p className="text-xl text-white/80">
            Conjugation practice and speaking with feedback
          </p>
        </div>

        <div className="mb-8 text-center flex flex-wrap justify-center gap-3">
          <Link
            href="/create-grammar"
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 inline-flex items-center"
          >
            + Create new deck
          </Link>
          <Link
            href="/decks"
            className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg border border-white/20 inline-flex items-center"
          >
            ← Vocab Decks
          </Link>
        </div>

        {decks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-2 text-white/90">No grammar decks yet</h2>
            <p className="text-white/70 mb-6">Create a grammar deck to practice conjugations and pronunciation.</p>
            <Link
              href="/create-grammar"
              className="inline-block px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all shadow-lg"
            >
              Create your first deck
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {decks.map((deck, index) => (
              <div
                key={deck.id}
                className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-white/20 card-glow hover:border-amber-400/40 transition-all opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    {deck.name}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteConfirmId(deleteConfirmId === deck.id ? null : deck.id);
                    }}
                    className="text-white/50 hover:text-red-400 transition-colors text-xl"
                  >
                    ×
                  </button>
                </div>
                {deck.description && (
                  <p className="text-white/70 mb-4 text-sm">{deck.description}</p>
                )}
                <div className="flex justify-between text-sm text-white/60 mb-4">
                  <span>{deck.cards.length} conjugations</span>
                  <LanguageBadge languageCode={deck.targetLanguage} />
                  <span>{formatDate(deck.createdDate)}</span>
                </div>
                {deleteConfirmId === deck.id && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-red-200 text-sm">Delete this deck?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(deck.id)}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Link
                    href={`/conjugation?deck=${deck.id}`}
                    className="py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-center transition-all"
                  >
                    Conjugation Practice
                  </Link>
                  <Link
                    href={`/grammar-speak?deck=${deck.id}`}
                    className="py-3 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/40 text-white font-semibold text-center transition-all"
                  >
                    Speaking / Pronunciation
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
