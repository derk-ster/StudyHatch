'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Deck } from '@/types/vocab';
import { duplicateDeck, getAllDecks, getDailyUsage, getDeckOwnerName, getPublicDecks, getUserLimits, incrementDailyPublicSearches, setDeckVisibility } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

export default function PublicDecksPage() {
  const { session } = useAuth();
  const [publicDecks, setPublicDecks] = useState<Deck[]>([]);
  const [filteredDecks, setFilteredDecks] = useState<Deck[]>([]);
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [previewDeck, setPreviewDeck] = useState<Deck | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showMyPublished, setShowMyPublished] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(getDailyUsage());
  const limits = getUserLimits();
  const visibleDecks = filteredDecks.slice(0, 100);

  useEffect(() => {
    const decks = getPublicDecks();
    setPublicDecks(decks);
    setFilteredDecks(decks);
    const allDecks = getAllDecks();
    const owned = session?.userId ? allDecks.filter(deck => deck.ownerUserId === session.userId) : allDecks.filter(deck => !deck.ownerUserId);
    setMyDecks(owned);
    setSelectedDeckId(owned[0]?.id || '');
    setDailyUsage(getDailyUsage());
  }, [session?.userId]);

  const handleCopyDeck = (deckId: string) => {
    const copied = duplicateDeck(deckId, session?.userId);
    if (copied) {
      setMessage(`Copied "${copied.name}" to My Decks.`);
      setError('');
    }
  };

  const handlePublicUpload = () => {
    if (!selectedDeckId) {
      setError('Select a deck to publish.');
      setMessage('');
      return;
    }
    const updated = setDeckVisibility(selectedDeckId, 'public');
    if (updated) {
      const decks = getPublicDecks();
      setPublicDecks(decks);
      setFilteredDecks(decks);
      setMessage('Deck published to Public Decks.');
      setError('');
    }
  };

  const filterDecks = (items: Deck[], searchQuery: string, onlyMine: boolean) => {
    let result = items;
    if (onlyMine) {
      result = result.filter(deck => {
        if (session?.userId) {
          return deck.ownerUserId === session.userId;
        }
        return !deck.ownerUserId;
      });
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return result;
    }

    const lower = trimmed.toLowerCase();
    return result.filter(deck => {
      const ownerName = getDeckOwnerName(deck).toLowerCase();
      return deck.name.toLowerCase().includes(lower) ||
        (deck.description || '').toLowerCase().includes(lower) ||
        ownerName.includes(lower);
    });
  };

  const refreshDecks = () => {
    const decks = getPublicDecks();
    setPublicDecks(decks);
    setFilteredDecks(filterDecks(decks, query, showMyPublished));
  };

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed && !showMyPublished) {
      setFilteredDecks(publicDecks);
      setError('');
      return;
    }

    if (limits.dailySearchLimit !== Infinity && (dailyUsage.publicSearchesToday || 0) >= limits.dailySearchLimit) {
      setError('Daily search limit reached. Try again later.');
      setMessage('');
      return;
    }

    setFilteredDecks(filterDecks(publicDecks, query, showMyPublished));
    setError('');
    if (limits.dailySearchLimit !== Infinity) {
      incrementDailyPublicSearches();
      setDailyUsage(getDailyUsage());
    }
  };

  const handleRemovePublished = (deckId: string) => {
    const updated = setDeckVisibility(deckId, 'private');
    if (updated) {
      refreshDecks();
      setMessage('Deck removed from Public Decks.');
      setError('');
    }
  };

  useEffect(() => {
    if (query.trim()) return;
    setFilteredDecks(filterDecks(publicDecks, '', showMyPublished));
  }, [publicDecks, query, showMyPublished]);

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Public Decks
            </h1>
            <button
              onClick={refreshDecks}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
            >
              Refresh
            </button>
          </div>
          <p className="text-white/70 mb-8">
            Explore shared decks and add them to your library.
          </p>

          {(message || error) && (
            <div className={`mb-6 p-4 rounded-lg ${error ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
              <p className={error ? 'text-red-400 font-medium' : 'text-green-300 font-medium'}>
                {error || message}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6 mb-8">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-3">Search Public Decks</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Search by deck name, description, or username"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all font-medium"
                >
                  Search
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={showMyPublished}
                  onChange={(e) => setShowMyPublished(e.target.checked)}
                  className="h-4 w-4"
                />
                Show only my published decks
              </label>
              <p className="text-white/60 text-sm mt-2">
                {limits.dailySearchLimit === Infinity
                  ? 'Unlimited searches available.'
                  : `${Math.max(0, limits.dailySearchLimit - (dailyUsage.publicSearchesToday || 0))} searches remaining today.`}
              </p>
              <p className="text-white/50 text-sm mt-1">
                Save any public deck to your library for personalized study.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-3">Publish a Deck</h2>
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {myDecks.map(deck => (
                  <option key={deck.id} value={deck.id} className="bg-gray-800">
                    {deck.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handlePublicUpload}
                className="w-full mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              >
                Publish to Public Decks
              </button>
            </div>
          </div>

          {visibleDecks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌍</div>
              <h2 className="text-2xl font-bold mb-2 text-white/90">No public decks yet</h2>
              <p className="text-white/70">Check back soon for shared decks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleDecks.map(deck => (
                <div key={deck.id} className="bg-white/10 rounded-2xl p-6 border border-white/20 card-glow relative">
                  {(session?.userId ? deck.ownerUserId === session.userId : !deck.ownerUserId) && (
                    <button
                      onClick={() => handleRemovePublished(deck.id)}
                      className="absolute right-4 top-4 text-white/60 hover:text-white text-sm"
                      title="Remove from Public Decks"
                    >
                      Remove
                    </button>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">{deck.name}</h3>
                  <p className="text-white/60 text-sm mb-2">Created by: {getDeckOwnerName(deck)}</p>
                  {deck.description && (
                    <p className="text-white/70 text-sm mb-3">{deck.description}</p>
                  )}
                  <p className="text-white/60 text-sm mb-4">{deck.cards.length} cards</p>
                  <div className="flex flex-col gap-3">
                    <Link
                      href={`/study?deck=${deck.id}`}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-center text-sm font-medium transition-all flex items-center justify-center"
                    >
                      Study Now
                    </Link>
                    <button
                      onClick={() => setPreviewDeck(deck)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white/10 hover:bg-white/20"
                    >
                      View Translations
                    </button>
                    <button
                      onClick={() => handleCopyDeck(deck.id)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white/10 hover:bg-white/20"
                    >
                      Copy to My Decks
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {previewDeck && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-3xl mx-4 border border-white/20 card-glow">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{previewDeck.name}</h2>
                {previewDeck.description && (
                  <p className="text-white/60 text-sm mt-1">{previewDeck.description}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewDeck(null)}
                className="text-white/60 hover:text-white text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto border border-white/10 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-white/70 font-semibold">English</th>
                    <th className="px-4 py-3 text-white/70 font-semibold">Translation</th>
                  </tr>
                </thead>
                <tbody>
                  {previewDeck.cards.map((card) => (
                    <tr key={card.id} className="border-b border-white/10 last:border-0">
                      <td className="px-4 py-3 text-white/80">{card.english}</td>
                      <td className="px-4 py-3 text-white/80">{card.translation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPreviewDeck(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
