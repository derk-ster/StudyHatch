'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import LanguageBadge from '@/components/LanguageBadge';
import { getAllDecks, getDeckById, getProgress, updateProgress, getDailyUsage, getUserLimits, getEffectiveClassSettingsForUser, getClassesForStudent } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';
import { isSchoolModeEnabled } from '@/lib/school-mode';
import { RESOURCES } from '@/app/resources/resources';

export default function Nav() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const schoolMode = isSchoolModeEnabled();
  const [showProgress, setShowProgress] = useState(false);
  const [currentDeck, setCurrentDeck] = useState<string | null>(null);
  const [decks, setDecks] = useState(getAllDecks());
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const [fromMarketingSite, setFromMarketingSite] = useState(false);
  const progress = getProgress();
  const effectiveSettings = session?.userId && session.role ? getEffectiveClassSettingsForUser(session.userId, session.role) : null;
  const hasClassMembership = session?.role === 'student' && session?.userId
    ? getClassesForStudent(session.userId).length > 0
    : false;
  const aiEnabled = !schoolMode
    || session?.role === 'teacher'
    || !hasClassMembership
    || (effectiveSettings?.aiTutorEnabled ?? false);
  const limits = getUserLimits();
  const aiLimit = limits.dailyAILimit;
  const aiRemaining = Math.max(0, aiLimit - (getDailyUsage().aiMessagesToday || 0));
  const isResourcesRoute = pathname?.startsWith('/resources');

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.referrer) {
      setFromMarketingSite(false);
      return;
    }
    try {
      const referrerUrl = new URL(document.referrer);
      const host = referrerUrl.hostname.toLowerCase();
      const isStudyHatchDomain = host === 'studyhatch.org' || host === 'www.studyhatch.org';
      const isLocalMarketing =
        host === 'localhost' &&
        referrerUrl.port === '3001' &&
        referrerUrl.pathname.toLowerCase().startsWith('/studyhatch.org');
      setFromMarketingSite(isStudyHatchDomain || isLocalMarketing);
    } catch {
      setFromMarketingSite(false);
    }
  }, []);

  useEffect(() => {
    if (!isResourcesRoute) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!resourcesOpen) return;
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isResourcesRoute, resourcesOpen]);


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
  const shouldShowGoBack = Boolean(
    pathname?.startsWith('/games') && fromMarketingSite && (!session || session.isGuest)
  );

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
          className="h-16 overflow-x-auto sm:overflow-x-visible"
          style={{ position: 'relative', zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="flex items-center justify-between h-16 min-w-max gap-4" 
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

            {isResourcesRoute ? (
              <div className="flex items-center flex-1">
                <div className="flex-1 flex justify-center">
                  <div ref={resourcesRef} className="relative">
                    <button
                      onClick={() => setResourcesOpen((prev) => !prev)}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
                    >
                      Resources
                    </button>
                    {resourcesOpen && (
                      <div className="absolute right-0 top-11 z-[99999] w-72 rounded-xl border border-white/15 bg-gray-900/95 p-3 shadow-2xl backdrop-blur">
                        <div className="max-h-80 overflow-y-auto">
                          {RESOURCES.map((entry) => (
                            <Link
                              key={entry.id}
                              href={`/resources/${entry.id}`}
                              onClick={() => setResourcesOpen(false)}
                              className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                            >
                              {entry.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
                  >
                    Home
                  </Link>
                </div>
              </div>
            ) : !session ? (
              <div className="flex items-center gap-3">
                {shouldShowGoBack && (
                  <Link
                    href="/"
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
                  >
                    ← Go Back
                  </Link>
                )}
                <Link
                  href="/games"
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
                >
                  Games
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(168,85,247,0.6)] transition-all hover:from-purple-500 hover:to-blue-500"
                >
                  Log In or Sign Up
                </Link>
              </div>
            ) : (
              <>
                {/* Middle Section - Deck Dropdown through Account/Login */}
                <div 
                  className="flex items-center space-x-4 flex-1 justify-center max-w-4xl mx-4 sm:mx-8" 
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

                  {shouldShowGoBack && (
                    <Link
                      href="/"
                      className="px-4 py-1 rounded-lg transition-all inline-block text-sm bg-white/10 hover:bg-white/20"
                      style={{ 
                        position: 'relative', 
                        zIndex: 99999, 
                        pointerEvents: 'auto', 
                        cursor: 'pointer', 
                        display: 'inline-block',
                      }}
                    >
                      ← Go Back
                    </Link>
                  )}
                  <Link
                    href="/games"
                    className={`px-4 py-1 rounded-lg transition-all inline-block text-sm ${
                      pathname?.startsWith('/games') ? 'bg-purple-600 text-white' : 'bg-white/10 hover:bg-white/20'
                    }`}
                    style={{ 
                      position: 'relative', 
                      zIndex: 99999, 
                      pointerEvents: 'auto', 
                      cursor: 'pointer', 
                      display: 'inline-block',
                    }}
                  >
                    Games
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
                    aria-disabled={!aiEnabled}
                    className={`px-4 py-1 rounded-lg transition-all text-sm font-medium inline-block relative ${
                      aiEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 text-white/60'
                    }`}
                    style={{ 
                      position: 'relative', 
                      zIndex: 99999, 
                      pointerEvents: 'auto', 
                      cursor: 'pointer', 
                      display: 'inline-block',
                    }}
                  >
                    🤖 AI Chat
                    {schoolMode ? (
                      <span className={`absolute -top-1 -right-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        aiEnabled ? 'bg-emerald-500 text-black' : 'bg-white/30 text-white'
                      }`}>
                        {aiRemaining}/{aiLimit}
                      </span>
                    ) : (
                      <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                        {aiRemaining}
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
                  <div className="px-4 py-1.5 text-sm font-medium text-white/80 whitespace-nowrap">
                    User: {session?.isGuest ? 'Guest' : `@${session?.username || 'Guest'}`}
                  </div>

                  {/* Progress Button */}
                  <button
                    onClick={() => setShowProgress(!showProgress)}
                    className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium whitespace-nowrap"
                  >
                    📊 Progress
                  </button>
                </div>
              </>
            )}
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
