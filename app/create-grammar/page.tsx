'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { GrammarDeck, GrammarCard } from '@/types/vocab';
import { saveGrammarDeck } from '@/lib/storage';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { useAuth } from '@/lib/auth-context';
import { getPresetsForLanguage, getPresetById } from '@/lib/grammar-presets';

const TENSES = [
  { id: 'present', label: 'Present' },
  { id: 'preterite', label: 'Preterite' },
  { id: 'imperfect', label: 'Imperfect' },
  { id: 'future', label: 'Future' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'present-subjunctive', label: 'Present Subjunctive' },
  { id: 'imperfect-subjunctive', label: 'Imperfect Subjunctive' },
];

const PERSONS = [
  { id: 'yo', label: 'yo' },
  { id: 'tú', label: 'tú' },
  { id: 'él/ella/usted', label: 'él/ella/usted' },
  { id: 'nosotros', label: 'nosotros' },
  { id: 'vosotros', label: 'vosotros' },
  { id: 'ellos/ellas/ustedes', label: 'ellos/ellas/ustedes' },
];

type CardRow = { infinitive: string; tense: string; person: string; answer: string; translation?: string };

function generateId() {
  return `gc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CreateGrammarDeckPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [entryMode, setEntryMode] = useState<'auto' | 'manual' | null>(null);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [cards, setCards] = useState<CardRow[]>([{ infinitive: '', tense: 'present', person: 'yo', answer: '', translation: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const presetsForLanguage = useMemo(() => getPresetsForLanguage(targetLanguage), [targetLanguage]);
  const selectedPreset = selectedPresetId ? getPresetById(selectedPresetId) : null;

  const addRow = () => {
    setCards(prev => [...prev, { infinitive: '', tense: 'present', person: 'yo', answer: '', translation: '' }]);
  };

  const updateRow = (index: number, field: keyof CardRow, value: string) => {
    setCards(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeRow = (index: number) => {
    if (cards.length === 0) return;
    setCards(prev => prev.filter((_, i) => i !== index));
  };

  const loadPreset = () => {
    const preset = selectedPresetId ? getPresetById(selectedPresetId) : null;
    if (!preset) return;
    setCards(preset.cards.map(c => ({
      infinitive: c.infinitive,
      tense: c.tense,
      person: c.person,
      answer: c.answer,
      translation: c.translation ?? '',
    })));
    if (!deckName.trim()) setDeckName(preset.name);
    setTargetLanguage(preset.languageCode);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = deckName.trim();
    if (!name) {
      setError('Deck name is required.');
      return;
    }
    const grammarCards: GrammarCard[] = cards
      .filter(row => row.infinitive.trim() && row.answer.trim())
      .map(row => ({
        id: generateId(),
        infinitive: row.infinitive.trim(),
        tense: row.tense,
        person: row.person,
        answer: row.answer.trim(),
        translation: row.translation?.trim() || undefined,
      }));
    if (grammarCards.length === 0) {
      setError('Add at least one conjugation (infinitive + answer required).');
      return;
    }
    setIsSaving(true);
    const deck: GrammarDeck = {
      id: `grammar-${Date.now()}`,
      name,
      description: deckDescription.trim() || undefined,
      cards: grammarCards,
      createdDate: Date.now(),
      targetLanguage,
      ownerUserId: session?.isGuest ? undefined : session?.userId,
    };
    saveGrammarDeck(deck);
    setIsSaving(false);
    router.push('/decks');
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-2">
            Create Grammar Deck
          </h1>
          <p className="text-white/70 mb-8">
            Add verb conjugations for conjugation and pronunciation practice. Choose suggested verbs or add your own, then edit before creating.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          )}

          {entryMode === null ? (
            <div className="space-y-4 mb-8">
              <p className="text-white/90 font-medium">How do you want to build your deck?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('auto');
                    setCards([]);
                  }}
                  className="p-6 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400/40 text-left transition-all"
                >
                  <span className="text-2xl block mb-2">✨</span>
                  <span className="font-semibold text-white block">Let the site suggest conjugations</span>
                  <span className="text-white/70 text-sm">We’ll add common verbs and tenses. You can edit the list before creating.</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('manual');
                    setCards([{ infinitive: '', tense: 'present', person: 'yo', answer: '', translation: '' }]);
                  }}
                  className="p-6 rounded-xl bg-white/10 hover:bg-white/20 border-2 border-white/20 text-left transition-all"
                >
                  <span className="text-2xl block mb-2">✏️</span>
                  <span className="font-semibold text-white block">Add my own conjugations</span>
                  <span className="text-white/70 text-sm">Start from scratch and enter each conjugation yourself.</span>
                </button>
              </div>
            </div>
          ) : null}

          {(entryMode === 'auto' || entryMode === 'manual') && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {entryMode === 'auto' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-3">
                  <p className="text-white/90 font-medium">1. Choose a suggested set</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label htmlFor="preset-lang" className="block text-xs text-white/70 mb-1">Language</label>
                      <select
                        id="preset-lang"
                        value={targetLanguage}
                        onChange={e => {
                          setTargetLanguage(e.target.value);
                          setSelectedPresetId('');
                        }}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {SUPPORTED_LANGUAGES.map(lang => (
                          <option key={lang.code} value={lang.code} className="bg-gray-800">{lang.flag} {lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="preset-select" className="block text-xs text-white/70 mb-1">Preset</label>
                      <select
                        id="preset-select"
                        value={selectedPresetId}
                        onChange={e => setSelectedPresetId(e.target.value)}
                        className="min-w-[220px] px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="" className="bg-gray-800">Choose a preset...</option>
                        {presetsForLanguage.map(p => (
                          <option key={p.id} value={p.id} className="bg-gray-800">{p.name}</option>
                        ))}
                      </select>
                      {presetsForLanguage.length === 0 && (
                        <p className="text-white/60 text-xs mt-1">No presets for this language yet.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={loadPreset}
                      disabled={!selectedPresetId}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
                    >
                      Load and edit
                    </button>
                  </div>
                  {selectedPreset && (
                    <p className="text-white/60 text-sm">{selectedPreset.description}</p>
                  )}
                </div>
              )}

              <p className="text-white/80 text-sm">
                {entryMode === 'auto' ? '2. Edit deck details and the list below, then create.' : 'Add your conjugations and create the deck.'}
              </p>

            <div>
              <label htmlFor="grammar-deck-name" className="block text-sm font-medium text-white/90 mb-2">
                Deck Name *
              </label>
              <input
                id="grammar-deck-name"
                type="text"
                value={deckName}
                onChange={e => setDeckName(e.target.value)}
                placeholder="e.g. Spanish Present Tense"
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="grammar-deck-desc" className="block text-sm font-medium text-white/90 mb-2">
                Description (optional)
              </label>
              <input
                id="grammar-deck-desc"
                type="text"
                value={deckDescription}
                onChange={e => setDeckDescription(e.target.value)}
                placeholder="e.g. Regular -ar verbs in present"
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="grammar-language" className="block text-sm font-medium text-white/90 mb-2">
                Target Language
              </label>
              <select
                id="grammar-language"
                value={targetLanguage}
                onChange={e => setTargetLanguage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-gray-800">
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white/90">
                  Conjugation entries *
                </label>
                <button
                  type="button"
                  onClick={addRow}
                  className="text-sm px-3 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 transition-colors"
                >
                  + Add row
                </button>
              </div>
              {entryMode === 'auto' && cards.length === 0 && (
                <p className="text-amber-200/90 text-sm mb-3">Load a preset above, or add rows below to build your own list.</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/70 border-b border-white/20">
                      <th className="text-left py-2 pr-2">Infinitive</th>
                      <th className="text-left py-2 pr-2">Tense</th>
                      <th className="text-left py-2 pr-2">Person</th>
                      <th className="text-left py-2 pr-2">Answer (conjugation)</th>
                      <th className="text-left py-2 pr-2">Translation (optional)</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((row, i) => (
                      <tr key={i} className="border-b border-white/10">
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={row.infinitive}
                            onChange={e => updateRow(i, 'infinitive', e.target.value)}
                            placeholder="hablar"
                            className="w-full min-w-[80px] px-2 py-1.5 rounded bg-white/10 text-white placeholder-white/40 border border-white/20"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <select
                            value={row.tense}
                            onChange={e => updateRow(i, 'tense', e.target.value)}
                            className="w-full min-w-[120px] px-2 py-1.5 rounded bg-white/10 text-white border border-white/20"
                          >
                            {TENSES.map(t => (
                              <option key={t.id} value={t.id} className="bg-gray-800">{t.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <select
                            value={row.person}
                            onChange={e => updateRow(i, 'person', e.target.value)}
                            className="w-full min-w-[100px] px-2 py-1.5 rounded bg-white/10 text-white border border-white/20"
                          >
                            {PERSONS.map(p => (
                              <option key={p.id} value={p.id} className="bg-gray-800">{p.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={row.answer}
                            onChange={e => updateRow(i, 'answer', e.target.value)}
                            placeholder="hablo"
                            className="w-full min-w-[80px] px-2 py-1.5 rounded bg-white/10 text-white placeholder-white/40 border border-white/20"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            type="text"
                            value={row.translation ?? ''}
                            onChange={e => updateRow(i, 'translation', e.target.value)}
                            placeholder="I speak"
                            className="w-full min-w-[80px] px-2 py-1.5 rounded bg-white/10 text-white placeholder-white/40 border border-white/20"
                          />
                        </td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            disabled={cards.length === 0}
                            className="text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Create Grammar Deck'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode(null);
                  setDeckName('');
                  setDeckDescription('');
                  setCards([{ infinitive: '', tense: 'present', person: 'yo', answer: '', translation: '' }]);
                }}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20"
              >
                Change approach
              </button>
              <Link
                href="/decks"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20"
              >
                Cancel
              </Link>
            </div>
          </form>
          )}
        </div>
      </main>
    </div>
  );
}
