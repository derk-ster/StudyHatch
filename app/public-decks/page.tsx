'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Deck } from '@/types/vocab';
import { duplicateDeck, getAllDecks, getDailyUsage, getPublicDecks, getUserLimits, incrementDailyPublicSearches, isPremium, setDeckVisibility } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

export default function PublicDecksPage() {
  const { session } = useAuth();
  const [publicDecks, setPublicDecks] = useState<Deck[]>([]);
  const [filteredDecks, setFilteredDecks] = useState<Deck[]>([]);
  const [myDecks, setMyDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dailyUsage, setDailyUsage] = useState(getDailyUsage());
  const limits = getUserLimits();
  const premium = isPremium();

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
    if (!premium) {
      setError('Upgrade to Premium to save public decks.');
      setMessage('');
      return;
    }
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

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setFilteredDecks(publicDecks);
      setError('');
      return;
    }

    if (limits.dailySearchLimit !== Infinity && (dailyUsage.publicSearchesToday || 0) >= limits.dailySearchLimit) {
      setError('Daily search limit reached. Upgrade to Premium for unlimited searches.');
      setMessage('');
      return;
    }

    const lower = trimmed.toLowerCase();
    const results = publicDecks.filter(deck =>
      deck.name.toLowerCase().includes(lower) ||
      (deck.description || '').toLowerCase().includes(lower)
    );
    setFilteredDecks(results);
    setError('');
    if (limits.dailySearchLimit !== Infinity) {
      incrementDailyPublicSearches();
      setDailyUsage(getDailyUsage());
    }
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Public Decks
          </h1>
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
                  placeholder="Search by deck name or description"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all font-medium"
                >
                  Search
                </button>
              </div>
              <p className="text-white/60 text-sm mt-2">
                {limits.dailySearchLimit === Infinity
                  ? 'Unlimited searches with Premium.'
                  : `${Math.max(0, limits.dailySearchLimit - (dailyUsage.publicSearchesToday || 0))} searches remaining today.`}
              </p>
              <p className="text-white/50 text-sm mt-1">
                Free users can study public decks. Saving requires Premium.
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

          {filteredDecks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌍</div>
              <h2 className="text-2xl font-bold mb-2 text-white/90">No public decks yet</h2>
              <p className="text-white/70">Check back soon for shared decks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDecks.map(deck => (
                <div key={deck.id} className="bg-white/10 rounded-2xl p-6 border border-white/20 card-glow">
                  <h3 className="text-2xl font-bold text-white mb-2">{deck.name}</h3>
                  {deck.description && (
                    <p className="text-white/70 text-sm mb-3">{deck.description}</p>
                  )}
                  <p className="text-white/60 text-sm mb-4">{deck.cards.length} cards</p>
                  <div className="flex gap-3">
                    <Link
                      href={`/study?deck=${deck.id}`}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-center text-sm font-medium transition-all"
                    >
                      Study Now
                    </Link>
                    <button
                      onClick={() => handleCopyDeck(deck.id)}
                      disabled={!premium}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        premium ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {premium ? 'Copy to My Decks' : 'Premium to Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
