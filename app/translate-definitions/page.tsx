'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { getDeckById, saveDeck } from '@/lib/storage';
import { getLanguageName } from '@/lib/languages';
import { VocabCard } from '@/types/vocab';

export default function TranslateDefinitionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;
  const [definitionInputs, setDefinitionInputs] = useState<string[]>([]);
  const [editedCards, setEditedCards] = useState<VocabCard[]>(deck?.cards || []);
  const [isTranslating, setIsTranslating] = useState(false);
  const [message, setMessage] = useState('');
  const apiBase = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    if (deck) {
      setEditedCards(deck.cards);
      setDefinitionInputs(deck.cards.map(() => ''));
    }
  }, [deckId]);

  const targetLanguageName = deck ? getLanguageName(deck.targetLanguage) : 'Translation';

  const handleTranslateDefinitions = async () => {
    if (!deck) return;
    const trimmedInputs = definitionInputs.map(input => input.trim());
    const indicesToTranslate = trimmedInputs
      .map((value, index) => (value ? index : -1))
      .filter(index => index >= 0);

    if (indicesToTranslate.length === 0) {
      setMessage('Add at least one definition to translate.');
      return;
    }

    const englishWords = indicesToTranslate.map(index => trimmedInputs[index]);
    setIsTranslating(true);
    setMessage('');

    try {
      const response = await fetch(`${apiBase}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          englishWords,
          targetLanguage: deck.targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate definitions');
      }

      const data = await response.json();
      const translations: Array<{ translation: string }> = data.translations || [];

      setEditedCards(prev => {
        const updated = [...prev];
        indicesToTranslate.forEach((cardIndex, i) => {
          const translated = translations[i]?.translation?.trim();
          if (translated) {
            updated[cardIndex] = { ...updated[cardIndex], definition: translated };
          }
        });
        return updated;
      });
      setMessage('Definitions translated.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to translate definitions.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = () => {
    if (!deck || !deckId) return;
    const cleanedCards = editedCards.map(card => ({
      ...card,
      definition: card.definition?.trim() || undefined,
    }));
    saveDeck({ ...deck, cards: cleanedCards });
    setMessage('Definitions saved.');
    setTimeout(() => setMessage(''), 1500);
  };

  const updateDefinition = (index: number, value: string) => {
    setEditedCards(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], definition: value };
      return updated;
    });
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
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h1 className="text-3xl font-bold">Translate Definitions</h1>
            {message && <span className="text-green-300 text-sm">{message}</span>}
          </div>
          <p className="text-white/70 mb-6">
            Add English definitions, then translate them into {targetLanguageName}.
          </p>

          <div className="space-y-4">
            {editedCards.map((card, index) => (
              <div key={card.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/80 font-semibold mb-2">{card.english}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <textarea
                    value={definitionInputs[index] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDefinitionInputs(prev => {
                        const updated = [...prev];
                        updated[index] = value;
                        return updated;
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Definition (English)"
                    rows={3}
                  />
                  <textarea
                    value={card.definition || ''}
                    onChange={(e) => updateDefinition(index, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`Definition (${targetLanguageName})`}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTranslateDefinitions}
              disabled={isTranslating}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all font-semibold disabled:opacity-50"
            >
              {isTranslating ? 'Translating...' : 'Translate Definitions'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
            >
              Save Definitions
            </button>
            <Link
              href={`/edit-translations?deck=${deckId}`}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-center"
            >
              Edit Translations
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
