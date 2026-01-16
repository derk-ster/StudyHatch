'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { getDeckById, saveDeck, canEditDeckToday, markDeckEditedToday, canSaveDeckToday, recordDeckSave } from '@/lib/storage';
import { VocabCard } from '@/types/vocab';
import { useAuth } from '@/lib/auth-context';

export default function EditTranslationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;
  const [editedCards, setEditedCards] = useState<VocabCard[]>(deck?.cards || []);
  const [saveMessage, setSaveMessage] = useState('');
  const [limitMessage, setLimitMessage] = useState('');
  const { session } = useAuth();

  useEffect(() => {
    if (deck) {
      setEditedCards(deck.cards);
    }
  }, [deckId]);

  const isTeacher = session?.role === 'teacher';
  const editStatus = !isTeacher && deckId ? canEditDeckToday(deckId) : { allowed: true };
  const canEdit = isTeacher ? true : editStatus.allowed;
  const saveStatus = !isTeacher ? canSaveDeckToday() : { allowed: true };
  const canSave = canEdit && saveStatus.allowed;

  const handleCardChange = (index: number, field: 'english' | 'translation' | 'definition', value: string) => {
    if (!canEdit || !deckId) return;
    if (!isTeacher) {
      markDeckEditedToday(deckId);
    }
    setEditedCards(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = () => {
    if (!deck || !deckId) return;
    if (!canSave) {
      setSaveMessage('');
      setLimitMessage(saveStatus.reason || 'Daily save limit reached.');
      return;
    }
    const cleanedCards = editedCards
      .map(card => ({
        ...card,
        english: card.english.trim(),
        translation: card.translation.trim(),
        definition: card.definition?.trim() || undefined,
      }))
      .filter(card => card.english && card.translation);
    saveDeck({ ...deck, cards: cleanedCards });
    if (!isTeacher) {
      recordDeckSave();
    }
    setLimitMessage('');
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
          {!isTeacher && !editStatus.allowed && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {editStatus.reason || 'Daily edit limit reached.'}
            </div>
          )}
          {!isTeacher && !saveStatus.allowed && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {saveStatus.reason || 'Daily save limit reached.'}
            </div>
          )}
          {!isTeacher && limitMessage && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-3 text-sm text-red-200">
              {limitMessage}
            </div>
          )}
          <p className="text-white/70 mb-6">Update translations and definitions for {deck.name}.</p>

          <div className="space-y-3">
            {editedCards.map((card, index) => (
              <div key={card.id} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={card.english}
                  onChange={(e) => handleCardChange(index, 'english', e.target.value)}
                  disabled={!canEdit}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  placeholder="English"
                />
                <input
                  value={card.translation}
                  onChange={(e) => handleCardChange(index, 'translation', e.target.value)}
                  disabled={!canEdit}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  placeholder="Translation"
                />
                <input
                  value={card.definition || ''}
                  onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                  disabled={!canEdit}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  placeholder="Definition (optional)"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
