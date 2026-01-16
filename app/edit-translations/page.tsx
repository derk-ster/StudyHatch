'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { getDeckById, saveDeck } from '@/lib/storage';
import { VocabCard } from '@/types/vocab';

export default function EditTranslationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;
  const [editedCards, setEditedCards] = useState<VocabCard[]>(deck?.cards || []);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (deck) {
      setEditedCards(deck.cards);
    }
  }, [deckId]);

  const handleCardChange = (index: number, field: 'english' | 'translation' | 'definition', value: string) => {
    setEditedCards(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    if (!deck || !deckId) return;
    const cleanedCards = editedCards
      .map(card => ({
        ...card,
        english: card.english.trim(),
        translation: card.translation.trim(),
        definition: card.definition?.trim() || undefined,
      }))
      .filter(card => card.english && card.translation);
    saveDeck({ ...deck, cards: cleanedCards });
    setSaveMessage('Changes saved.');
    setTimeout(() => setSaveMessage(''), 1500);
  };

  if (!deck) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-xl text-white/70">Deck not found.</p>
            <button
              onClick={() => router.push('/decks')}
              className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
            >
              Go to Decks
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="text-3xl font-bold">Edit Translations</h1>
            {saveMessage && <span className="text-green-300 text-sm">{saveMessage}</span>}
          </div>
          <p className="text-white/70 mb-6">Update translations and definitions for {deck.name}.</p>

          <div className="space-y-3">
            {editedCards.map((card, index) => (
              <div key={card.id} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={card.english}
                  onChange={(e) => handleCardChange(index, 'english', e.target.value)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="English"
                />
                <input
                  value={card.translation}
                  onChange={(e) => handleCardChange(index, 'translation', e.target.value)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Translation"
                />
                <input
                  value={card.definition || ''}
                  onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Definition (optional)"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all font-semibold"
            >
              Save Changes
            </button>
            <Link
              href={`/translate-definitions?deck=${deckId}`}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-center"
            >
              Translate Definitions
            </Link>
            <Link
              href={`/study?deck=${deckId}`}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-center"
            >
              Back to Study
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
