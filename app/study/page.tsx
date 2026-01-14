'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import LanguageBadge from '@/components/LanguageBadge';
import { getDeckById } from '@/lib/storage';
import { ActivityType } from '@/types/vocab';
import { getLanguageName } from '@/lib/languages';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const deckId = searchParams.get('deck');
  const deck = deckId ? getDeckById(deckId) : null;

  const createActivityUrl = (activity: ActivityType | 'ai-chat') => {
    if (activity === 'ai-chat') {
      return '/ai-chat';
    }
    if (!deckId) return '#';
    const params = new URLSearchParams();
    params.set('deck', deckId);
    return `/${activity}?${params.toString()}`;
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

  const targetLanguageName = getLanguageName(deck.targetLanguage);

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 opacity-0 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            Study: {deck.name}
          </h1>
          {deck.description && (
            <p className="text-xl text-white/80 mb-4">{deck.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-white/70">
            <span>{deck.cards.length} cards</span>
            <span>•</span>
            <LanguageBadge languageCode={deck.targetLanguage} />
            <span>•</span>
            <span>{targetLanguageName}</span>
          </div>
        </div>

        {/* Study Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <Link
              key={activity.id}
              href={createActivityUrl(activity.id)}
              className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 transition-all card-glow card-glow-hover opacity-0 animate-slide-up hover:border-purple-500 hover:bg-purple-500/10"
              style={{ animationDelay: `${index * 0.1}s` }}
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

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/decks')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-white"
          >
            ← Back to Decks
          </button>
        </div>
      </main>
    </div>
  );
}
