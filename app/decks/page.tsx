'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { StreakPetWidget } from '@/components/StreakPet';
import { getAllDecks, deleteDeck, getUserLimits, getOwnedClassrooms, getPublishedDecksForDeck, publishDeckToClassroom, setDeckVisibility, getClassesForStudent, getClassDeckIdsForStudent, getActiveClassDecks, reorderDecksByIds } from '@/lib/storage';
import { Deck, ActivityType, Classroom } from '@/types/vocab';
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

export default function ViewDecksPage() {
  const { session } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [personalDecks, setPersonalDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [ownedClassrooms, setOwnedClassrooms] = useState<Classroom[]>([]);
  const [publishSelections, setPublishSelections] = useState<Record<string, { classroomId: string; expiration: string }>>({});
  const [publishMessage, setPublishMessage] = useState('');
  const [publishError, setPublishError] = useState('');
  const [classDecks, setClassDecks] = useState<Deck[]>([]);
  const [classDeckLabels, setClassDeckLabels] = useState<Record<string, string>>({});
  const [draggingDeckId, setDraggingDeckId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const allDecks = getAllDecks();
    setDecks(allDecks);
    setPersonalDecks(allDecks);
  }, [session?.userId, session?.isGuest]);

  useEffect(() => {
    if (session?.userId) {
      setOwnedClassrooms(getOwnedClassrooms(session.userId));
      if (session.role === 'student') {
        const studentClasses = getClassesForStudent(session.userId);
        const deckIds = getClassDeckIdsForStudent(session.userId);
        const allDecks = getAllDecks();
        setClassDecks(allDecks.filter(deck => deckIds.includes(deck.id)));
        setPersonalDecks(
          allDecks.filter(deck => deck.ownerUserId === session.userId || (!deck.ownerUserId && !deckIds.includes(deck.id)))
        );
        const labelMap: Record<string, string> = {};
        deckIds.forEach(deckId => {
          const classNames = studentClasses
            .filter(classroom => getActiveClassDecks(classroom.id).some(entry => entry.deckId === deckId))
            .map(classroom => classroom.name);
          if (classNames.length > 0) {
            labelMap[deckId] = classNames.join(', ');
          }
        });
        setClassDeckLabels(labelMap);
      }
    }
  }, [session?.userId]);

  const limits = getUserLimits();
  const visiblePersonalDecks = session?.role === 'student' ? personalDecks : decks;

  const handleDelete = (deckId: string) => {
    deleteDeck(deckId);
    const allDecks = getAllDecks();
    setDecks(allDecks);
    if (session?.role === 'student') {
      const classDeckIds = session?.userId ? getClassDeckIdsForStudent(session.userId) : [];
      setPersonalDecks(allDecks.filter(deck => deck.ownerUserId === session.userId || (!deck.ownerUserId && !classDeckIds.includes(deck.id))));
    } else {
      setPersonalDecks(allDecks);
    }
    setShowDeleteConfirm(null);
    
    if (selectedDeck === deckId) {
      setSelectedDeck(null);
    }
  };

  const createActivityUrl = (activity: ActivityType | 'ai-chat', deckId: string) => {
    if (activity === 'ai-chat') {
      return '/ai-chat';
    }
    const params = new URLSearchParams();
    params.set('deck', deckId);
    return `/${activity}?${params.toString()}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const expirationOptions = [
    { value: '1d', label: '1 day' },
    { value: '3d', label: '3 days' },
    { value: '1w', label: '1 week' },
    { value: '1m', label: '1 month' },
    { value: 'never', label: 'Never expires' },
  ];

  const getExpirationTimestamp = (selection: string): number | null => {
    const now = Date.now();
    switch (selection) {
      case '1d':
        return now + 24 * 60 * 60 * 1000;
      case '3d':
        return now + 3 * 24 * 60 * 60 * 1000;
      case '1w':
        return now + 7 * 24 * 60 * 60 * 1000;
      case '1m':
        return now + 30 * 24 * 60 * 60 * 1000;
      default:
        return null;
    }
  };

  const handlePublishSelection = (deckId: string, updates: Partial<{ classroomId: string; expiration: string }>) => {
    setPublishSelections(prev => ({
      ...prev,
      [deckId]: {
        classroomId: prev[deckId]?.classroomId || ownedClassrooms[0]?.id || '',
        expiration: prev[deckId]?.expiration || 'never',
        ...updates,
      },
    }));
  };

  const handlePublishDeck = (deckId: string) => {
    const selection = publishSelections[deckId];
    if (!selection?.classroomId) {
      setPublishError('Select a classroom before publishing.');
      setPublishMessage('');
      return;
    }
    const expiresAt = getExpirationTimestamp(selection.expiration);
    publishDeckToClassroom(deckId, selection.classroomId, expiresAt);
    setPublishMessage('Deck published to classroom.');
    setPublishError('');
  };

  const handleVisibilityChange = (deckId: string, visibility: 'private' | 'public') => {
    const updated = setDeckVisibility(deckId, visibility);
    if (updated) {
      setPublishMessage(`Deck set to ${visibility}.`);
      setPublishError('');
      const allDecks = getAllDecks();
      setDecks(allDecks);
      setPersonalDecks(allDecks);
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
    const reordered = [...visiblePersonalDecks];
    const fromIndex = reordered.findIndex(deck => deck.id === sourceId);
    const toIndex = reordered.findIndex(deck => deck.id === targetDeckId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    reorderDecksByIds(reordered.map(deck => deck.id));
    setDecks(getAllDecks());
    setPersonalDecks(reordered);
    setDraggingDeckId(null);
    setIsDragging(false);
  };

  const handleGridDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingDeckId;
    if (!sourceId) return;
    const reordered = [...visiblePersonalDecks];
    const fromIndex = reordered.findIndex(deck => deck.id === sourceId);
    if (fromIndex <= 0) {
      setDraggingDeckId(null);
      setIsDragging(false);
      return;
    }
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.unshift(moved);
    reorderDecksByIds(reordered.map(deck => deck.id));
    setDecks(getAllDecks());
    setPersonalDecks(reordered);
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

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 opacity-0 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            Your Vocabulary Decks
          </h1>
          <p className="text-xl text-white/80">
            View and study your custom vocabulary decks
          </p>
        </div>

        {/* Streak Pet Widget */}
        <div className="mb-6 flex justify-center" style={{ position: 'relative', zIndex: 10 }}>
          <StreakPetWidget />
        </div>

        {/* Create Deck Button */}
        <div className="mb-8 text-center flex justify-center" key="create-deck-button">
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
        <div className="mb-8 flex flex-col sm:flex-row justify-center gap-3">
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
          <Link
            href="/pricing"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all text-center"
          >
            Premium
          </Link>
        </div>

        {/* Limits Info */}
        <div className="mb-8 text-center">
          <p className="text-white/60 text-sm">
            {limits.maxDecks === Infinity ? 'Unlimited' : `${visiblePersonalDecks.length} / ${limits.maxDecks}`} decks • {limits.maxCards === Infinity ? 'Unlimited' : limits.maxCards} card limit
          </p>
        </div>

        {(publishError || publishMessage) && (
          <div className={`mb-6 p-4 rounded-lg ${publishError ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
            <p className={publishError ? 'text-red-400 font-medium' : 'text-green-300 font-medium'}>
              {publishError || publishMessage}
            </p>
          </div>
        )}

        {/* Decks List */}
        {visiblePersonalDecks.length === 0 ? (
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
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-start"
            style={{ gridAutoFlow: 'row', alignContent: 'start' }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleGridDrop}
          >
            {visiblePersonalDecks.map((deck, index) => (
              <div
                key={deck.id}
                data-deck-card
                className={`group relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 card-glow card-glow-hover opacity-0 animate-slide-up hover-lift-scale ${
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
                    <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-white/80 text-sm mb-2">Sharing</p>
                      <select
                        value={deck.visibility || 'private'}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleVisibilityChange(deck.id, e.target.value as 'private' | 'public');
                        }}
                        className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="private" className="bg-gray-800">Private</option>
                        <option value="public" className="bg-gray-800">Public</option>
                      </select>
                    </div>
                    {ownedClassrooms.length > 0 && (
                      <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-white/80 text-sm mb-2">Publish to Classroom</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <select
                            value={publishSelections[deck.id]?.classroomId || ownedClassrooms[0]?.id || ''}
                            onChange={(e) => handlePublishSelection(deck.id, { classroomId: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {ownedClassrooms.map(classroom => (
                              <option key={classroom.id} value={classroom.id} className="bg-gray-800">
                                {classroom.name || classroom.classCode}
                              </option>
                            ))}
                          </select>
                          <select
                            value={publishSelections[deck.id]?.expiration || 'never'}
                            onChange={(e) => handlePublishSelection(deck.id, { expiration: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            {expirationOptions.map(option => (
                              <option key={option.value} value={option.value} className="bg-gray-800">
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePublishDeck(deck.id);
                            }}
                            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all"
                          >
                            Publish
                          </button>
                        </div>
                        {getPublishedDecksForDeck(deck.id).length > 0 && (
                          <p className="text-white/60 text-xs mt-2">
                            Published to {getPublishedDecksForDeck(deck.id).length} classroom{getPublishedDecksForDeck(deck.id).length !== 1 ? 's' : ''}.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {activities.slice(0, 6).map((activity) => (
                        <Link
                          key={activity.id}
                          href={createActivityUrl(activity.id, deck.id)}
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

        {session?.role === 'student' && classDecks.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-white mb-4">Classroom Decks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-start">
              {classDecks.map((deck, index) => (
                <div
                  key={deck.id}
                  className="group relative bg-emerald-500/10 backdrop-blur-md rounded-2xl p-6 border-2 border-emerald-400/40 card-glow opacity-0 animate-slide-up hover-lift-scale"
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    transition: 'transform 0.18s ease, background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                      {deck.name}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-emerald-500/30 rounded-full text-emerald-100">
                      Classroom
                    </span>
                  </div>
                  {deck.description && (
                    <p className="text-white/70 mb-4 text-sm">{deck.description}</p>
                  )}
                  <div className="flex justify-between items-center text-sm text-white/60 mb-2">
                    <span>{deck.cards.length} cards</span>
                    <span>{formatDate(deck.createdDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <LanguageBadge languageCode={deck.targetLanguage} />
                  </div>
                  {classDeckLabels[deck.id] && (
                    <p className="text-emerald-200/80 text-xs mb-3">Class: {classDeckLabels[deck.id]}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {activities.slice(0, 4).map((activity) => (
                      <Link
                        key={activity.id}
                        href={createActivityUrl(activity.id, deck.id)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-center text-sm transition-all"
                      >
                        {activity.icon} {activity.name}
                      </Link>
                    ))}
                    <Link
                      href={`/study?deck=${deck.id}`}
                      className="col-span-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-center text-sm transition-all font-medium"
                    >
                      View All Activities →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up">
              <h2 className="text-2xl font-bold mb-4">Delete Deck?</h2>
              <p className="text-white/70 mb-6">
                Are you sure you want to delete this deck? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
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
