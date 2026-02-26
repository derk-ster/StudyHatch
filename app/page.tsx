'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { StreakPetWidget } from '@/components/StreakPet';
import { Deck, GrammarDeck, ActivityType } from '@/types/vocab';
import { getAllDecks, getAllGrammarDecks, deleteDeck, deleteGrammarDeck, getUserLimits, getCombinedDeckOrder, setCombinedDeckOrder } from '@/lib/storage';
import { buildShareDeckUrl, getShortShareUrl } from '@/lib/share-deck';
import { useAuth } from '@/lib/auth-context';
import { getDeckXP, getXPInfo } from '@/lib/xp';
import { useScrollPopupIntoView } from '@/lib/scroll-popup-into-view';

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

const ENCOURAGING_MESSAGES = [
  "You've got this!",
  "One word at a time!",
  "Your brain is leveling up!",
  "Every word counts!",
  "You're doing amazing!",
  "Keep the momentum going!",
  "Progress, not perfection!",
];

type DeckItem = { type: 'vocab'; deck: Deck } | { type: 'grammar'; deck: GrammarDeck };

function buildOrderedDeckList(): DeckItem[] {
  const vocab = getAllDecks();
  const grammar = getAllGrammarDecks();
  const order = getCombinedDeckOrder();
  const byId = new Map<string, DeckItem>();
  vocab.forEach(d => byId.set(d.id, { type: 'vocab', deck: d }));
  grammar.forEach(d => byId.set(d.id, { type: 'grammar', deck: d }));
  const ordered: DeckItem[] = [];
  order.forEach(id => {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  });
  byId.forEach(item => ordered.push(item));
  return ordered;
}

export default function Home() {
  const { session, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [allDecks, setAllDecks] = useState<DeckItem[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; type: 'vocab' | 'grammar' } | null>(null);
  const deleteConfirmPopupRef = useScrollPopupIntoView(!!showDeleteConfirm);
  const decksToShare = allDecks
    .filter((item): item is { type: 'vocab'; deck: Deck } => item.type === 'vocab' && item.deck.ownerUserId === session?.userId)
    .map(item => item.deck);
  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [encouragingMessage] = useState(() => 
    ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)]
  );
  const [shareDecksOpen, setShareDecksOpen] = useState(false);
  const [shareDecksSearch, setShareDecksSearch] = useState('');
  const [shareLinkCopiedForDeck, setShareLinkCopiedForDeck] = useState<string | null>(null);
  const shareDecksPopupRef = useScrollPopupIntoView(shareDecksOpen);

  useEffect(() => {
    if (!shareDecksOpen) setShareDecksSearch('');
  }, [shareDecksOpen]);

  useEffect(() => {
    if (isLoading || !session) return;
    const list = buildOrderedDeckList();
    setAllDecks(list);
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      setSelectedDeck(deckParam);
    } else if (list.length > 0) {
      setSelectedDeck(list[0].deck.id);
    }
  }, [searchParams, pathname, session, isLoading]);

  if (!session) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-xl opacity-0 animate-slide-up">
            <h1 className="text-4xl font-bold leading-tight pb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 sm:text-5xl">
              StudyHatch makes language learning simpler
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Build custom vocabulary decks, practice translations, and study with interactive games.
            </p>
            <div className="mt-6 flex items-center justify-center">
              <div className="inline-flex items-center gap-3">
                <Link
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-2 font-semibold text-white shadow-[0_0_22px_rgba(168,85,247,0.75)] transition-all hover:from-purple-500 hover:to-blue-500"
                  href="/login?mode=signup"
                >
                  Sign Up
                </Link>
                <Link
                  className="rounded-lg bg-white/10 px-5 py-2 font-semibold text-white transition-all hover:bg-white/20"
                  href="/login"
                >
                  Log In
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Flashcards + games', text: 'Study with flashcards, matching, quizzes, and writing modes.' },
              { title: 'Translation practice', text: 'Move beyond words with sentence-level practice and recall.' },
              { title: 'Teacher ready', text: 'Create classroom decks and share targeted vocabulary.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 opacity-0 animate-slide-up">
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-white/70">{item.text}</p>
              </div>
            ))}
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 opacity-0 animate-slide-up">
              <h2 className="text-2xl font-semibold leading-tight pb-1">About StudyHatch</h2>
              <p className="mt-3 text-white/80 leading-relaxed">
                StudyHatch is built for students and teachers who want a simple way to grow vocabulary, retain it, and
                practice with short, focused activities.
              </p>
              <p className="mt-3 text-white/70 leading-relaxed">
                Log in to create decks, track progress, and unlock the full study experience.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 opacity-0 animate-slide-up">
              <h2 className="text-2xl font-semibold leading-tight pb-1">Activities inside StudyHatch</h2>
              <div className="mt-4 flex flex-wrap gap-3 text-white/80">
                {[
                  'Flashcards',
                  'Match Game',
                  'Quiz',
                  'Write Mode',
                  'Word Scramble',
                  'AI Chat',
                  'Translation Practice',
                  'Classroom Decks',
                ].map((activity) => (
                  <span key={activity} className="rounded-xl border border-white/10 bg-black/20 px-4 py-2">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const { level, xpForNextLevel } = getXPInfo();
  const xpToNextLabel = xpForNextLevel > 0 ? `${xpForNextLevel} XP to level up` : 'Max level';

  const limits = getUserLimits();

  const handleDeleteDeck = (deckId: string, type: 'vocab' | 'grammar') => {
    if (type === 'vocab') {
      deleteDeck(deckId);
    } else {
      deleteGrammarDeck(deckId);
    }
    const list = buildOrderedDeckList();
    setAllDecks(list);
    setShowDeleteConfirm(null);
    if (selectedDeck === deckId) {
      setSelectedDeck(list.length > 0 ? list[0].deck.id : null);
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, deckId: string) => {
    event.stopPropagation();
    event.dataTransfer.setData('text/plain', deckId);
    event.dataTransfer.effectAllowed = 'move';
    const card = event.currentTarget.closest('[data-deck-card]') as HTMLElement | null;
    if (card) {
      const rect = card.getBoundingClientRect();
      event.dataTransfer.setDragImage(card, rect.width / 2, rect.height / 2);
    }
    setDraggingDeckId(deckId);
    setIsDragging(true);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, targetDeckId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingDeckId;
    if (!sourceId || sourceId === targetDeckId) return;
    const reordered = [...allDecks];
    const fromIndex = reordered.findIndex(item => item.deck.id === sourceId);
    const toIndex = reordered.findIndex(item => item.deck.id === targetDeckId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const newOrder = reordered.map(item => item.deck.id);
    setCombinedDeckOrder(newOrder);
    setAllDecks(reordered);
    setDraggingDeckId(null);
    setIsDragging(false);
  };

  const handleGridDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingDeckId;
    if (!sourceId) return;
    const reordered = [...allDecks];
    const fromIndex = reordered.findIndex(item => item.deck.id === sourceId);
    if (fromIndex <= 0) {
      setDraggingDeckId(null);
      setIsDragging(false);
      return;
    }
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.unshift(moved);
    const newOrder = reordered.map(item => item.deck.id);
    setCombinedDeckOrder(newOrder);
    setAllDecks(reordered);
    setDraggingDeckId(null);
    setIsDragging(false);
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    if (!draggingDeckId) return;
    const gridEl = gridRef.current;
    const dropTarget = event.relatedTarget as Node | null;
    if (!gridEl || !dropTarget || !gridEl.contains(dropTarget)) {
      handleGridDrop(event);
      return;
    }
    setDraggingDeckId(null);
    setIsDragging(false);
  };

  const createActivityUrl = (activity: ActivityType | 'ai-chat', deckId: string, type: 'vocab' | 'grammar') => {
    if (type === 'grammar') {
      return `/conjugation?deck=${deckId}`;
    }
    if (activity === 'ai-chat') return '/ai-chat';
    const params = new URLSearchParams();
    params.set('deck', deckId);
    return `/${activity}?${params.toString()}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleCopyShareLink = async (deck: Deck) => {
    try {
      const url = await getShortShareUrl(deck);
      await navigator.clipboard.writeText(url);
      setShareLinkCopiedForDeck(deck.id);
      setTimeout(() => setShareLinkCopiedForDeck(null), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(buildShareDeckUrl(deck));
        setShareLinkCopiedForDeck(deck.id);
        setTimeout(() => setShareLinkCopiedForDeck(null), 2000);
      } catch {
        setShareLinkCopiedForDeck(null);
      }
    }
  };

  const shareDecksFiltered = shareDecksSearch.trim()
    ? decksToShare.filter(
        d =>
          d.name.toLowerCase().includes(shareDecksSearch.trim().toLowerCase()) ||
          (d.description ?? '').toLowerCase().includes(shareDecksSearch.trim().toLowerCase())
      )
    : decksToShare;

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12" data-reveal>
          <div className="relative inline-block">
            <h1 className="text-5xl font-bold mb-4 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              Your Vocabulary Decks
            </h1>
            <Image
              src="/Arrow.png"
              alt=""
              width={140}
              height={140}
              className="absolute -right-10 -bottom-6 h-auto w-[120px] sm:w-[140px]"
              priority
            />
          </div>
          <p className="text-xl text-white/80 mb-2">
            Create and study your custom vocabulary decks
          </p>
          <p className="text-lg text-purple-300/80 font-medium">
            {encouragingMessage}
          </p>
          <p className="text-sm text-white/70 mt-2">
            User level: {level} • {xpToNextLabel}
          </p>
        </div>

        {/* Streak Pet Widget */}
        <div className="mb-6 flex justify-center" style={{ position: 'relative', zIndex: 10 }} data-reveal>
          <StreakPetWidget />
        </div>

        {/* Create Deck Buttons: Vocab + Grammar */}
        <div className="mb-8 text-center flex flex-wrap justify-center gap-3" key="create-deck-buttons" data-reveal>
          <Link
            href="/create"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg text-lg pulse-glow whitespace-nowrap inline-flex items-center justify-center hover-lift-scale"
            style={{ 
              transition: 'transform 0.18s ease, background-color 0.2s ease',
            }}
          >
            + Create New Vocab Deck
          </Link>
          <Link
            href="/grammar-decks"
            className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-lg text-lg whitespace-nowrap inline-flex items-center justify-center hover-lift-scale border border-amber-400/30"
            style={{ 
              transition: 'transform 0.18s ease, background-color 0.2s ease',
            }}
          >
            Practice Grammar and Pronunciation
          </Link>
        </div>

        {/* Secondary Links - relative z-10 so dropdown paints above deck grid (avoids backdrop-blur covering it) */}
        <div className="relative z-10 mb-8 flex flex-col sm:flex-row justify-center gap-3" data-reveal>
          <Link
            href="/classrooms"
            className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-sm font-medium transition-all text-center"
          >
            Classrooms
          </Link>
          <Link
            href="/public-decks"
            className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-100 text-sm font-medium transition-all text-center"
          >
            Public Decks
          </Link>
          <details className="relative z-10 w-full sm:w-auto min-w-0">
            <summary className="w-full px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-100 text-sm font-medium transition-all text-center cursor-pointer list-none flex items-center justify-center hover-lift-only [&::-webkit-details-marker]:hidden">
              Leaderboards
            </summary>
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-xl p-2 z-[200]">
              <Link
                href="/leaderboards?scope=public"
                className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-all"
              >
                Public Leaderboards
              </Link>
              <Link
                href="/leaderboards?scope=classroom"
                className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-all"
              >
                Classroom Leaderboards
              </Link>
              <Link
                href="/leaderboards?scope=levels"
                className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-all"
              >
                Level Leaderboards
              </Link>
            </div>
          </details>
          <button
            type="button"
            onClick={() => setShareDecksOpen(true)}
            className="px-4 py-2 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-100 text-sm font-medium transition-all text-center hover-lift-only"
          >
            Share Decks
          </button>
        </div>

        {/* Limits Info */}
        <div className="mb-8 text-center">
          <p className="text-white/60 text-sm">
            {limits.maxDecks === Infinity ? 'Unlimited' : `${allDecks.length} / ${limits.maxDecks}`} decks • {limits.maxCards === Infinity ? 'Unlimited' : limits.maxCards} card limit
          </p>
        </div>

        {/* Decks List */}
        {allDecks.length === 0 ? (
          <div className="text-center py-16" data-reveal>
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2 text-white/90">No decks yet</h2>
            <p className="text-white/70 mb-6">Create your first vocabulary deck to get started!</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg"
            >
              Create Your First Vocab Deck
            </Link>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-start"
            style={{ gridAutoFlow: 'row', alignContent: 'start' }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleGridDrop}
          >
            {allDecks.map((item, index) => {
              const deck = item.deck;
              const isVocab = item.type === 'vocab';
              const isSelected = selectedDeck === deck.id;
              return (
                <div
                  key={deck.id}
                  data-deck-card
                  className={`group relative backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 ease-in-out card-glow card-glow-hover opacity-0 animate-slide-up ${
                    isVocab
                      ? `bg-white/10 ${isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-white/20'}`
                      : `bg-amber-500/10 ${isSelected ? 'border-amber-500 bg-amber-500/20' : 'border-amber-400/30'}`
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    transition: 'transform 0.18s ease, background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                    gridRow: isSelected ? 'span 2' : 'span 1',
                    zIndex: draggingDeckId === deck.id ? 50 : 'auto',
                  }}
                  onClick={() => {
                    if (isDragging) return;
                    setSelectedDeck(isSelected ? null : deck.id);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, deck.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className={`text-2xl font-bold text-white transition-colors ${isVocab ? 'group-hover:text-purple-300' : 'group-hover:text-amber-200'}`}>
                      {deck.name}
                    </h3>
                    {!isVocab && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-100 font-medium">Grammar</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm({ id: deck.id, type: item.type });
                      }}
                      className="text-white/50 hover:text-red-400 transition-colors text-xl"
                    >
                      ×
                    </button>
                  </div>
                  {deck.description && (
                    <p className="text-white/70 mb-4 text-sm">{deck.description}</p>
                  )}
                  <div className="flex justify-between text-sm text-white/60 mb-2">
                    <div className="flex flex-col gap-2">
                      <span>{deck.cards.length} {isVocab ? 'cards' : 'conjugations'}</span>
                      <LanguageBadge languageCode={deck.targetLanguage} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span>{formatDate(deck.createdDate)}</span>
                      {isVocab && <span className="text-xs text-white/60">XP gained: {getDeckXP(deck.id)}</span>}
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, deck.id)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-all"
                      >
                        Drag
                      </button>
                    </div>
                  </div>
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isSelected ? '500px' : '0px',
                      opacity: isSelected ? 1 : 0,
                    }}
                  >
                    <div className="mt-4 pt-4 border-t border-white/20">
                      {isVocab ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {activities.slice(0, 6).map((activity) => (
                              <Link
                                key={activity.id}
                                href={createActivityUrl(activity.id, deck.id, 'vocab')}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center text-sm transition-all"
                              >
                                {activity.icon} {activity.name}
                              </Link>
                            ))}
                          </div>
                          <Link
                            href={`/study?deck=${deck.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-center transition-all font-medium"
                          >
                            View All Activities →
                          </Link>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Link
                            href={`/conjugation?deck=${deck.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg text-center transition-all font-medium"
                          >
                            Conjugation Practice
                          </Link>
                          <Link
                            href={`/grammar-speak?deck=${deck.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-3 bg-amber-600/80 hover:bg-amber-500 border border-amber-400/40 rounded-lg text-center transition-all font-medium"
                          >
                            Speaking / Pronunciation
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Share Decks Modal */}
        {shareDecksOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in overflow-y-auto" onClick={() => setShareDecksOpen(false)}>
            <div ref={shareDecksPopupRef} className="modal-panel bg-gray-900 rounded-2xl p-4 sm:p-6 md:p-8 max-w-lg border border-white/20 card-glow animate-slide-up my-auto w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-2">Share Decks</h2>
              <p className="text-white/60 text-sm mb-4">
                Copy a link to share a deck with specific people (e.g. paste in Google Slides or email). To share with a whole class, use &quot;Publish to Classroom&quot; on the Decks page.
              </p>
              {decksToShare.length > 0 && (
                <input
                  type="text"
                  value={shareDecksSearch}
                  onChange={e => setShareDecksSearch(e.target.value)}
                  placeholder="Search decks by name or description..."
                  className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm mb-3"
                />
              )}
              {decksToShare.length === 0 ? (
                <p className="text-white/50 text-sm">You don’t have any decks to share yet. Create a deck first.</p>
              ) : shareDecksFiltered.length === 0 ? (
                <p className="text-white/50 text-sm">No decks match your search.</p>
              ) : (
                <ul className="space-y-3 overflow-y-auto flex-1 min-h-0">
                  {shareDecksFiltered.map(deck => (
                    <li key={deck.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="min-w-0 flex-1">
                        <p className="text-white/90 font-medium truncate">{deck.name}</p>
                        <p className="text-white/50 text-xs">{deck.cards.length} cards</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyShareLink(deck)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 text-sm font-medium transition-all border border-amber-400/40 hover-scale-only"
                      >
                        {shareLinkCopiedForDeck === deck.id ? '✓ Copied!' : 'Copy share link'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShareDecksOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-fade-in overflow-y-auto">
            <div ref={deleteConfirmPopupRef} className="modal-panel bg-gray-900 rounded-2xl p-4 sm:p-6 md:p-8 max-w-md border border-white/20 card-glow animate-slide-up my-auto">
              <h2 className="text-2xl font-bold mb-4">Delete Deck?</h2>
              <p className="text-white/70 mb-6">
                This will permanently delete the deck and all its cards. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showDeleteConfirm && handleDeleteDeck(showDeleteConfirm.id, showDeleteConfirm.type)}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
