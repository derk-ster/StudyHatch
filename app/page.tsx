'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { StreakPetWidget } from '@/components/StreakPet';
import { Deck, ActivityType } from '@/types/vocab';
import { getAllDecks, deleteDeck, getUserLimits } from '@/lib/storage';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [encouragingMessage] = useState(() => 
    ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)]
  );

  useEffect(() => {
    const loadedDecks = getAllDecks();
    setDecks(loadedDecks);
    
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      setSelectedDeck(deckParam);
    } else if (loadedDecks.length > 0) {
      setSelectedDeck(loadedDecks[0].id);
    }
  }, [searchParams, pathname]);

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
        <div className="text-center mb-12 opacity-0 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            Your Vocabulary Decks
          </h1>
          <p className="text-xl text-white/80 mb-2">
            Create and study your custom vocabulary decks
          </p>
          <p className="text-lg text-purple-300/80 font-medium">
            {encouragingMessage}
          </p>
        </div>

        {/* Streak Pet Widget */}
        <div className="mb-6 flex justify-center" key="streak-pet">
          <StreakPetWidget />
        </div>

        {/* Create Deck Button */}
        <div className="mb-8 text-center flex justify-center" key="create-deck-button">
          <Link
            href="/create"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg text-lg pulse-glow whitespace-nowrap inline-flex items-center justify-center"
            style={{ 
              transition: 'background-color 0.2s ease',
            }}
          >
            + Create New Deck
          </Link>
        </div>

        {/* Limits Info */}
        <div className="mb-8 text-center">
          <p className="text-white/60 text-sm">
            {limits.maxDecks === Infinity ? 'Unlimited' : `${decks.length} / ${limits.maxDecks}`} decks • {limits.maxCards === Infinity ? 'Unlimited' : limits.maxCards} card limit
          </p>
        </div>

        {/* Decks List */}
        {decks.length === 0 ? (
          <div className="text-center py-16 opacity-0 animate-fade-in">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-start" style={{ gridAutoFlow: 'row', alignContent: 'start' }}>
            {decks.map((deck, index) => (
              <div
                key={deck.id}
                className={`group relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 transition-all duration-300 ease-in-out card-glow card-glow-hover opacity-0 animate-slide-up ${
                  selectedDeck === deck.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20'
                }`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  transition: 'all 0.3s ease-in-out',
                  gridRow: selectedDeck === deck.id ? 'span 2' : 'span 1',
                }}
                onClick={() => {
                  // Toggle: if already selected, close it; otherwise, open it
                  setSelectedDeck(selectedDeck === deck.id ? null : deck.id);
                }}
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
                <div className="flex justify-between items-center text-sm text-white/60 mb-2">
                  <span>{deck.cards.length} cards</span>
                  <span>{formatDate(deck.createdDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LanguageBadge languageCode={deck.targetLanguage} />
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
