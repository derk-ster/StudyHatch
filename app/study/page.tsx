'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';

// Full-page home URL so "Back to Decks" always works (avoids client router + hash issues)
const basePath = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_PATH || '') : '';
const homeHref = basePath ? (basePath.endsWith('/') ? basePath : basePath + '/') : '/';
import LanguageBadge from '@/components/LanguageBadge';
import { getDeckById, saveDeck, canEditDeckBySource, recordDeckSave, copyDeckToUser, hasUserCopiedDeck, markDeckAsCopiedByUser, getAllDecks } from '@/lib/storage';
import { getSharePayloadFromHash, decodeSharePayload, decodeAndSaveSharedDeck, buildShareDeckUrl, getSharePayloadStableId } from '@/lib/share-deck';
import { ActivityType } from '@/types/vocab';
import { getLanguageName } from '@/lib/languages';
import { useAuth } from '@/lib/auth-context';

const activities: { id: ActivityType | 'ai-chat'; name: string; icon: string; description: string }[] = [
  {
    id: 'flashcards',
    name: 'Flashcards',
    icon: '🃏',
    description: 'Flip through cards and study at your own pace',
  },
  {
    id: 'match',
    name: 'Match Game',
    icon: '🎯',
    description: 'Match translation and English pairs',
  },
  {
    id: 'quiz',
    name: 'Quiz',
    icon: '✏️',
    description: 'Multiple choice questions',
  },
  {
    id: 'write',
    name: 'Write Mode',
    icon: '✍️',
    description: 'Type the correct translation',
  },
  {
    id: 'scramble',
    name: 'Word Scramble',
    icon: '🔀',
    description: 'Unscramble words',
  },
  {
    id: 'ai-chat',
    name: 'AI Chat',
    icon: '🤖',
    description: 'Chat with AI assistant for study help',
  },
];

export default function StudyPage() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;
  const [editedCards, setEditedCards] = useState(deck?.cards || []);
  const [saveMessage, setSaveMessage] = useState('');
  const [limitMessage, setLimitMessage] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [sharedPreviewDeck, setSharedPreviewDeck] = useState<typeof deck>(null);
  const [sharedPayload, setSharedPayload] = useState<string | null>(null);
  const [copyingToDecks, setCopyingToDecks] = useState(false);
  const [copyingToDeck, setCopyingToDeck] = useState(false);

  // Decode share link for preview only. Do NOT save here — save only when user clicks "Copy to my decks".
  const shareHash =
    typeof window !== 'undefined' ? window.location.hash : '';
  useEffect(() => {
    const payload = getSharePayloadFromHash();
    if (payload) {
      setSharedPayload(payload);
      const preview = decodeSharePayload(payload);
      setSharedPreviewDeck(preview ?? null);
      // Never call decodeAndSaveSharedDeck or saveDeck here — prevents auto-duplicate.
    } else {
      setSharedPayload(null);
      setSharedPreviewDeck(null);
    }
  }, [shareHash]);

  const handleCopyToMyDecks = () => {
    if (!sharedPayload) return;
    setCopyingToDecks(true);
    const preview = decodeSharePayload(sharedPayload);
    if (preview) {
      const existing = getAllDecks().find(
        (d) =>
          d.name === preview.name &&
          d.cards.length === preview.cards.length &&
          (d.ownerUserId === session?.userId || (!d.ownerUserId && !session?.userId))
      );
      if (existing) {
        markDeckAsCopiedByUser(getSharePayloadStableId(sharedPayload));
        setCopyingToDecks(false);
        router.replace(`/study?deck=${existing.id}`);
        return;
      }
    }
    const newId = decodeAndSaveSharedDeck(sharedPayload);
    setCopyingToDecks(false);
    if (newId) {
      markDeckAsCopiedByUser(getSharePayloadStableId(sharedPayload));
      router.replace(`/study?deck=${newId}`);
    }
  };

  // Copy an already-saved shared deck to user's decks as an editable copy (from study?deck=xxx view)
  const handleCopySharedToMyDeck = () => {
    if (!displayDeck || displayDeck.id === 'shared-preview' || isPreviewMode) return;
    setCopyingToDeck(true);
    const copied = copyDeckToUser(displayDeck, session?.userId);
    markDeckAsCopiedByUser(displayDeck.id);
    setCopyingToDeck(false);
    router.replace(`/study?deck=${copied.id}`);
  };

  const handleCopyShareLink = async () => {
    if (!deck) return;
    const url = buildShareDeckUrl(deck);
    try {
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch {
      setShareLinkCopied(false);
    }
  };

  useEffect(() => {
    const d = deck ?? sharedPreviewDeck;
    if (d) setEditedCards(d.cards);
  }, [deckId, sharedPreviewDeck, deck]);

  const displayDeck = deck ?? sharedPreviewDeck;
  const isPreviewMode = Boolean(sharedPreviewDeck && !deck);

  const createActivityUrl = (activity: ActivityType | 'ai-chat') => {
    if (activity === 'ai-chat') {
      return '/ai-chat';
    }
    if (!displayDeck?.id) return '#';
    if (isPreviewMode && sharedPayload) {
      // Allow activities in preview: pass share hash so activity page can decode deck
      return `/${activity}?deck=shared-preview#share=${encodeURIComponent(sharedPayload)}`;
    }
    if (isPreviewMode) return '#';
    const params = new URLSearchParams();
    params.set('deck', displayDeck.id);
    return `/${activity}?${params.toString()}`;
  };

  if (!displayDeck) {
    return (
      <div className="min-h-screen bg-noise" style={{ position: 'relative', zIndex: 0 }}>
        <Nav />
        <main className="max-w-4xl mx-auto px-4 py-12" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-xl text-white/70">Deck not found.</p>
            <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
              If your teacher shared this link, ask them to use &quot;Copy share link&quot; from the deck (or Share Decks) so you receive the deck when you open the link.
            </p>
            <a
              href={homeHref}
              className="mt-4 inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
            >
              Go to Decks
            </a>
          </div>
        </main>
      </div>
    );
  }

  const targetLanguageName = getLanguageName(displayDeck.targetLanguage);
  const isTeacher = session?.role === 'teacher';
  const canEditBySource = canEditDeckBySource(displayDeck, session);
  const canEdit = isTeacher ? true : canEditBySource;
  const canSave = canEdit;
  // Shared = from share link (source 'shared') or deck owned by someone else (teacher/class) — hide Edit Deck Terms
  const isSharedViewOnly =
    !isTeacher &&
    (displayDeck.source === 'shared' ||
      (!!displayDeck.ownerUserId &&
        displayDeck.ownerUserId !== session?.userId &&
        displayDeck.source !== 'public-copy'));
  const showEditDeckTerms = !isSharedViewOnly;

  const handleCardChange = (index: number, field: 'english' | 'translation' | 'definition', value: string) => {
    if (!canEdit || isPreviewMode || !displayDeck?.id) return;
    setEditedCards(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    if (!canEdit || isPreviewMode) return;
    const newCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      english: '',
      translation: '',
      definition: '',
    };
    setEditedCards(prev => [...prev, newCard]);
  };

  const handleSaveEdits = () => {
    if (!canEdit || isPreviewMode || !displayDeck?.id || displayDeck.id === 'shared-preview') return;
    const cleanedCards = editedCards
      .map(card => ({
        ...card,
        english: card.english.trim(),
        translation: card.translation.trim(),
        definition: card.definition?.trim() || undefined,
      }))
      .filter(card => card.english && card.translation);
    saveDeck({ ...displayDeck, cards: cleanedCards });
    if (!isTeacher) recordDeckSave();
    setLimitMessage('');
    setSaveMessage('Edits saved.');
    setTimeout(() => setSaveMessage(''), 1500);
  };

  return (
    <div className="min-h-screen bg-noise" style={{ position: 'relative', zIndex: 0 }}>
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
        {/* Always-visible escape: Back to Decks (native link = full page load, works even with hash URLs) */}
        <div className="mb-6 flex justify-start">
          <a
            href={homeHref}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 text-sm font-medium transition-all inline-flex items-center gap-2"
          >
            ← Back to Decks
          </a>
        </div>
        {/* Header */}
        <div className="text-center mb-12" data-reveal>
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            Study: {displayDeck.name}
          </h1>
          {displayDeck.description && (
            <p className="text-xl text-white/80 mb-4">{displayDeck.description}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/70">
            <span>{displayDeck.cards.length} cards</span>
            <span>•</span>
            <LanguageBadge languageCode={displayDeck.targetLanguage} />
            <span>•</span>
            <span>{targetLanguageName}</span>
            {!isPreviewMode && (
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="ml-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition-all"
              >
                {shareLinkCopied ? '✓ Link copied!' : 'Copy share link'}
              </button>
            )}
          </div>
          {!isPreviewMode && (
            <p className="text-white/50 text-xs mt-2">
              Use &quot;Copy share link&quot; to paste in Google Slides or send to students — they can open the link and choose to copy the deck.
            </p>
          )}
        </div>

        {/* Study Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <Link
              key={activity.id}
              href={createActivityUrl(activity.id)}
              className="group backdrop-blur-md rounded-2xl p-8 border-2 transition-all card-glow opacity-0 animate-slide-up bg-white/10 border-white/20 card-glow-hover hover:border-purple-500 hover:bg-purple-500/10"
              style={{ animationDelay: `${index * 0.1}s` }}
              title={isPreviewMode ? 'Practice with shared deck (progress not saved)' : undefined}
            >
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">
                {activity.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 text-center group-hover:text-purple-300 transition-colors">
                {activity.name}
              </h3>
              <p className="text-white/70 text-sm text-center">
                {activity.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Edit Deck Terms — only for own decks or public copies, not shared/teacher decks */}
        {showEditDeckTerms && (
          <div className="mt-12 bg-white/10 rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Edit Deck Terms</h2>
              {saveMessage && <span className="text-green-300 text-sm">{saveMessage}</span>}
            </div>
            {!isTeacher && limitMessage && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-3 text-sm text-red-200">
                {limitMessage}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mb-4">
              <Link
                href={canEdit && !isPreviewMode ? `/edit-translations?deck=${displayDeck.id}` : '#'}
                onClick={(e) => {
                  if (!canEdit) {
                    e.preventDefault();
                    setLimitMessage('Editing is not available for this deck.');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${canEdit ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 text-white/50 cursor-not-allowed'}`}
              >
                Edit Translations
              </Link>
              <Link
                href={canEdit && !isPreviewMode ? `/translate-definitions?deck=${displayDeck.id}` : '#'}
                onClick={(e) => {
                  if (!canEdit) {
                    e.preventDefault();
                    setLimitMessage('Editing is not available for this deck.');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${canEdit ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 text-white/50 cursor-not-allowed'}`}
              >
                Translate Definitions
              </Link>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[600px] space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-white/60 font-medium mb-2">
                  <span>English</span>
                  <span>{targetLanguageName}</span>
                  <span>Definition (optional)</span>
                </div>
                {editedCards.map((card, index) => (
                  <div key={card.id} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={card.english}
                      onChange={(e) => handleCardChange(index, 'english', e.target.value)}
                      disabled={!canEdit}
                      placeholder="English"
                      className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <input
                      value={card.translation}
                      onChange={(e) => handleCardChange(index, 'translation', e.target.value)}
                      disabled={!canEdit}
                      placeholder={targetLanguageName}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <input
                      value={card.definition ?? ''}
                      onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                      disabled={!canEdit}
                      placeholder="Definition"
                      className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-medium"
                >
                  + Add row
                </button>
              )}
              <button
                onClick={handleSaveEdits}
                disabled={!canSave}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Back to Decks + Copy to my deck (for shared decks) */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={homeHref}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white inline-block"
            >
              ← Back to Decks
            </a>
            {isSharedViewOnly && !isPreviewMode && displayDeck.id !== 'shared-preview' && !hasUserCopiedDeck(displayDeck.id) && (
              <button
                type="button"
                onClick={handleCopySharedToMyDeck}
                disabled={copyingToDeck}
                className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {copyingToDeck ? 'Copying…' : 'Copy to my deck'}
              </button>
            )}
            {isSharedViewOnly && !isPreviewMode && displayDeck.id !== 'shared-preview' && hasUserCopiedDeck(displayDeck.id) && (
              <span className="text-white/60 text-sm">Already in your decks</span>
            )}
          </div>
          {/* Shared deck (preview): Copy to my decks — below Back to Decks */}
          {isPreviewMode && (
            <div className="mt-6 rounded-2xl border-2 border-amber-400/50 bg-amber-500/20 p-6 text-center">
              {sharedPayload && hasUserCopiedDeck(getSharePayloadStableId(sharedPayload)) ? (
                <p className="text-lg text-amber-100">You’ve already copied this deck to your decks.</p>
              ) : (
                <>
                  <p className="text-lg text-amber-100 mb-3">This deck was shared with you. Copy it to your decks to save and practice.</p>
                  <button
                    type="button"
                    onClick={handleCopyToMyDecks}
                    disabled={copyingToDecks}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {copyingToDecks ? 'Copying…' : 'Copy to my decks'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
