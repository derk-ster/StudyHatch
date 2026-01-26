'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { StreakPetWidget } from '@/components/StreakPet';
import { Deck, ActivityType } from '@/types/vocab';
import { getAllDecks, deleteDeck, getUserLimits, reorderDecksByIds } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { getDeckXP, getXPInfo } from '@/lib/xp';

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

export default function Home() {
  const { session, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [encouragingMessage] = useState(() => 
    ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)]
  );

  useEffect(() => {
    if (isLoading || !session) return;
    const loadedDecks = getAllDecks();
    setDecks(loadedDecks);
    
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      setSelectedDeck(deckParam);
    } else if (loadedDecks.length > 0) {
      setSelectedDeck(loadedDecks[0].id);
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
              <div className="relative inline-flex items-center gap-3">
                <div className="absolute -left-44 -top-10 flex flex-col items-center">
                  <Image
                    src="/ClickHereText.png"
                    alt=""
                    width={160}
                    height={80}
                    className="h-auto w-[140px]"
                    priority
                  />
                  <Image
                    src="/ClickHereArrow.png"
                    alt=""
                    width={180}
                    height={120}
                    className="h-auto w-[160px] -mt-10"
                    priority
                  />
                </div>
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

  const handleDeleteDeck = (deckId: string) => {
    deleteDeck(deckId);
    const updatedDecks = getAllDecks();
    setDecks(updatedDecks);
    setShowDeleteConfirm(null);
    
    if (selectedDeck === deckId) {
      setSelectedDeck(updatedDecks.length > 0 ? updatedDecks[0].id : null);
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
    const reordered = [...decks];
    const fromIndex = reordered.findIndex(deck => deck.id === sourceId);
    const toIndex = reordered.findIndex(deck => deck.id === targetDeckId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    reorderDecksByIds(reordered.map(deck => deck.id));
    setDecks(reordered);
    setDraggingDeckId(null);
    setIsDragging(false);
  };

  const handleGridDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingDeckId;
    if (!sourceId) return;
    const reordered = [...decks];
    const fromIndex = reordered.findIndex(deck => deck.id === sourceId);
    if (fromIndex <= 0) {
      setDraggingDeckId(null);
      setIsDragging(false);
      return;
    }
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.unshift(moved);
    reorderDecksByIds(reordered.map(deck => deck.id));
    setDecks(reordered);
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

  const createActivityUrl = (activity: ActivityType | 'ai-chat') => {
    if (activity === 'ai-chat') {
      return '/ai-chat';
    }
    if (!selectedDeck) return '#';
    const params = new URLSearchParams();
    params.set('deck', selectedDeck);
    return `/${activity}?${params.toString()}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

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

        {/* Create Deck Button */}
        <div className="mb-8 text-center flex justify-center" key="create-deck-button" data-reveal>
          <Link
            href="/create"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg text-lg pulse-glow whitespace-nowrap inline-flex items-center justify-center hover-lift-scale"
            style={{ 
              transition: 'transform 0.18s ease, background-color 0.2s ease',
            }}
          >
            + Create New Deck
          </Link>
        </div>

        {/* Secondary Links */}
        <div className="mb-8 flex flex-col sm:flex-row justify-center gap-3" data-reveal>
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
          <details className="relative">
            <summary className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-100 text-sm font-medium transition-all text-center cursor-pointer list-none inline-flex items-center justify-center hover-lift-only [&::-webkit-details-marker]:hidden">
              Leaderboards
            </summary>
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-xl p-2 z-20">
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
        </div>

        {/* Limits Info */}
        <div className="mb-8 text-center">
          <p className="text-white/60 text-sm">
            {limits.maxDecks === Infinity ? 'Unlimited' : `${decks.length} / ${limits.maxDecks}`} decks • {limits.maxCards === Infinity ? 'Unlimited' : limits.maxCards} card limit
          </p>
        </div>

        {/* Decks List */}
        {decks.length === 0 ? (
          <div className="text-center py-16" data-reveal>
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2 text-white/90">No decks yet</h2>
            <p className="text-white/70 mb-6">Create your first vocabulary deck to get started!</p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg"
            >
              Create Your First Deck
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
            {decks.map((deck, index) => (
              <div
                key={deck.id}
                data-deck-card
                className={`group relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 ease-in-out card-glow card-glow-hover opacity-0 animate-slide-up ${
                  selectedDeck === deck.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20'
                }`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  transition: 'transform 0.18s ease, background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                  gridRow: selectedDeck === deck.id ? 'span 2' : 'span 1',
                  zIndex: draggingDeckId === deck.id ? 50 : 'auto',
                }}
                onClick={() => {
                  if (isDragging) return;
                  // Toggle: if already selected, close it; otherwise, open it
                  setSelectedDeck(selectedDeck === deck.id ? null : deck.id);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, deck.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {deck.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(deck.id);
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
                    <span>{deck.cards.length} cards</span>
                    <LanguageBadge languageCode={deck.targetLanguage} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span>{formatDate(deck.createdDate)}</span>
                    <span className="text-xs text-white/60">XP gained: {getDeckXP(deck.id)}</span>
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
                    maxHeight: selectedDeck === deck.id ? '500px' : '0px',
                    opacity: selectedDeck === deck.id ? 1 : 0,
                  }}
                >
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="grid grid-cols-2 gap-2">
                      {activities.slice(0, 6).map((activity) => (
                        <Link
                          key={activity.id}
                          href={createActivityUrl(activity.id)}
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up">
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
                  onClick={() => handleDeleteDeck(showDeleteConfirm)}
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
