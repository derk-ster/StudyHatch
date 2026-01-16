'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import LanguageBadge from '@/components/LanguageBadge';
import { ActivityType } from '@/types/vocab';
import { getAllDecks, getDeckById, getProgress, updateProgress, hasAISubscription, getDailyUsage, getUserLimits } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

export default function Nav() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [showProgress, setShowProgress] = useState(false);
  const [currentDeck, setCurrentDeck] = useState<string | null>(null);
  const [decks, setDecks] = useState(getAllDecks());
  const progress = getProgress();

  useEffect(() => {
    const loadedDecks = getAllDecks();
    setDecks(loadedDecks);
    
    const deckParam = searchParams.get('deck');
    if (deckParam) {
      setCurrentDeck(deckParam);
    } else if (loadedDecks.length > 0) {
      setCurrentDeck(loadedDecks[0].id);
    }
  }, [searchParams]);

  const handleDeckChange = (deckId: string) => {
    setCurrentDeck(deckId);
    updateProgress({ lastDeck: deckId });
    
    // Update URL
    const params = new URLSearchParams();
    params.set('deck', deckId);
    
    if (pathname === '/request-vocab' || pathname === '/create') {
      router.push(`/?${params.toString()}`);
    } else {
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const currentDeckData = currentDeck ? getDeckById(currentDeck) : null;

  return (
    <nav 
      className="sticky top-0 z-[99999] bg-black/30 backdrop-blur-md border-b border-white/10" 
      style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 99999,
        isolation: 'isolate',
        transform: 'translateZ(0)',
        willChange: 'transform',
        pointerEvents: 'auto',
        WebkitTransform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      <div 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" 
        style={{ position: 'relative', zIndex: 99999, pointerEvents: 'auto' }}
      >
        <div 
          className="flex items-center justify-between h-16" 
          style={{ position: 'relative', zIndex: 99999, pointerEvents: 'auto' }}
        >
          <Link 
            href="/" 
            className="flex items-center gap-2 min-w-0"
            style={{ 
              position: 'relative', 
              zIndex: 99999, 
              pointerEvents: 'auto', 
              cursor: 'pointer',
            }}
          >
            <Image
              src={`${basePath}/WebsiteLogo.png`}
              alt="StudyHatch Logo"
              width={32}
              height={32}
              className="h-8 w-8 flex-shrink-0 rounded-md object-cover"
              priority
            />
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 whitespace-nowrap">
              StudyHatch
            </span>
          </Link>

          {/* Middle Section - Deck Dropdown through Account/Login */}
          <div 
            className="flex items-center space-x-4 flex-1 justify-center max-w-4xl mx-8" 
            style={{ position: 'relative', zIndex: 99999, pointerEvents: 'auto' }}
          >
            {/* Deck Dropdown */}
            {decks.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={currentDeck || ''}
                  onChange={(e) => handleDeckChange(e.target.value)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id} className="bg-gray-800">
                      {deck.name} ({deck.cards.length})
                    </option>
                  ))}
                </select>
                {currentDeckData && <LanguageBadge languageCode={currentDeckData.targetLanguage} />}
              </div>
            )}

            {/* Home Link */}
            <Link
              href="/"
              className={`px-4 py-1 rounded-lg transition-all inline-block text-sm ${
                pathname === '/' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
              }`}
              style={{ 
                position: 'relative', 
                zIndex: 99999, 
                pointerEvents: 'auto', 
                cursor: 'pointer', 
                display: 'inline-block',
              }}
            >
              Home
            </Link>


            {session?.role === 'teacher' && (
              <Link
                href="/teacher-dashboard"
                className={`px-4 py-1 rounded-lg transition-all inline-block text-sm ${
                  pathname === '/teacher-dashboard' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
                style={{ 
                  position: 'relative', 
                  zIndex: 99999, 
                  pointerEvents: 'auto', 
                  cursor: 'pointer', 
                  display: 'inline-block',
                }}
              >
                Teacher Dashboard
              </Link>
            )}

            {/* AI Chat Link */}
            <Link
              href="/ai-chat"
              className="px-4 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium inline-block relative"
              style={{ 
                position: 'relative', 
                zIndex: 99999, 
                pointerEvents: 'auto', 
                cursor: 'pointer', 
                display: 'inline-block',
              }}
            >
              🤖 AI Chat
              {!hasAISubscription() && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {Math.max(0, getUserLimits().dailyAILimit - (getDailyUsage().aiMessagesToday || 0))}
                </span>
              )}
            </Link>


            {/* Login/Account Links */}
            {session && !session.isGuest ? (
              <Link
                href="/account"
                className={`px-4 py-1.5 rounded-lg transition-all text-sm font-medium inline-block ${
                  pathname === '/account' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
                style={{ 
                  position: 'relative', 
                  zIndex: 99999, 
                  pointerEvents: 'auto', 
                  cursor: 'pointer', 
                  display: 'inline-block',
                }}
              >
                Account
              </Link>
            ) : (
              <Link
                href="/login"
                className={`px-4 py-1.5 rounded-lg transition-all text-sm font-medium inline-block ${
                  pathname === '/login' ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                }`}
                style={{ 
                  position: 'relative', 
                  zIndex: 99999, 
                  pointerEvents: 'auto', 
                  cursor: 'pointer', 
                  display: 'inline-block',
                }}
              >
                Login
              </Link>
            )}
          </div>

          {/* Right Section - User Display and Progress Button */}
          <div className="flex items-center space-x-4">
            {/* User Display */}
            <div className="px-4 py-1.5 text-sm font-medium text-white/80">
              User: {session?.isGuest ? 'Guest' : `@${session?.username || 'Guest'}`}
            </div>

            {/* Progress Button */}
            <button
              onClick={() => setShowProgress(!showProgress)}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
            >
              📊 Progress
            </button>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgress && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in min-h-screen"
          onClick={() => setShowProgress(false)}
        >
          <div 
            className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-white/20 card-glow animate-slide-up my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Your Progress
              </h2>
              <button
                onClick={() => setShowProgress(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {currentDeckData && progress.deckProgress?.[currentDeckData.id] ? (
                <>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/70 text-sm">Words Learned</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {progress.deckProgress[currentDeckData.id].knownCards.length}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/70 text-sm">Starred Words</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {progress.deckProgress[currentDeckData.id].starredCards.length}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/70 text-sm">Quiz High Score</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {progress.deckProgress[currentDeckData.id].quizHighScore || 0}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/70 text-sm">Current Streak</div>
                    <div className="text-2xl font-bold text-green-400">
                      {progress.deckProgress[currentDeckData.id].quizStreak || 0}
                    </div>
                  </div>
                  {progress.deckProgress[currentDeckData.id].matchBestTime && (
                    <div className="bg-white/5 rounded-lg p-4 col-span-2">
                      <div className="text-white/70 text-sm">Best Match Time</div>
                      <div className="text-2xl font-bold text-indigo-400">
                        {Math.floor(progress.deckProgress[currentDeckData.id].matchBestTime! / 60)}:{(progress.deckProgress[currentDeckData.id].matchBestTime! % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 col-span-2">
                  <div className="text-white/70 text-sm">No progress yet</div>
                  <div className="text-sm text-white/50 mt-1">Start studying to track your progress!</div>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <Link
                href="/progress"
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-center transition-all"
                onClick={() => setShowProgress(false)}
              >
                View Full Progress
              </Link>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                    const { resetProgress } = require('@/lib/storage');
                    resetProgress();
                    setShowProgress(false);
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
