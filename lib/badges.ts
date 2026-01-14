/**
 * Badges and Achievements System
 */

import { Badge, UserProgress } from '@/types/vocab';
import { getProgress, saveProgress } from './storage';
import { getAllDecks } from './storage';

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (progress: UserProgress, decks: any[]) => boolean;
};

// Badge definitions
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_study',
    name: 'First Steps',
    description: 'Studied your first card',
    icon: '🌟',
    check: (progress) => {
      if (!progress.deckProgress) return false;
      return Object.values(progress.deckProgress).some(dp => dp.knownCards.length > 0 || dp.learningCards.length > 0);
    },
  },
  {
    id: 'five_day_streak',
    name: 'Dedicated Learner',
    description: 'Maintained a 5-day study streak',
    icon: '🔥',
    check: (progress) => (progress.dailyStreak || 0) >= 5,
  },
  {
    id: 'three_decks',
    name: 'Deck Master',
    description: 'Created 3 vocabulary decks',
    icon: '📚',
    check: (progress, decks) => decks.length >= 3,
  },
  {
    id: 'hundred_words',
    name: 'Word Collector',
    description: 'Learned 100 words',
    icon: '💯',
    check: (progress) => {
      if (!progress.deckProgress) return false;
      const totalLearned = Object.values(progress.deckProgress).reduce(
        (sum, dp) => sum + dp.knownCards.length,
        0
      );
      return totalLearned >= 100;
    },
  },
  {
    id: 'thirty_day_streak',
    name: 'Streak Champion',
    description: 'Maintained a 30-day study streak',
    icon: '🏆',
    check: (progress) => (progress.dailyStreak || 0) >= 30,
  },
];

// Check and award badges
export function checkAndAwardBadges(): Badge[] {
  const progress = getProgress();
  const decks = getAllDecks();
  const currentBadges = progress.badges || [];
  const awardedBadgeIds = new Set(currentBadges.map(b => b.id));
  
  const newlyAwarded: Badge[] = [];
  
  for (const badgeDef of BADGE_DEFINITIONS) {
    if (awardedBadgeIds.has(badgeDef.id)) continue;
    
    if (badgeDef.check(progress, decks)) {
      const newBadge: Badge = {
        id: badgeDef.id,
        name: badgeDef.name,
        description: badgeDef.description,
        icon: badgeDef.icon,
        earnedAt: Date.now(),
      };
      
      currentBadges.push(newBadge);
      newlyAwarded.push(newBadge);
    }
  }
  
  if (newlyAwarded.length > 0) {
    progress.badges = currentBadges;
    saveProgress(progress);
  }
  
  return newlyAwarded;
}

// Get all badges
export function getAllBadges(): Badge[] {
  const progress = getProgress();
  return progress.badges || [];
}

// Get badge by ID
export function getBadgeById(badgeId: string): Badge | undefined {
  const badges = getAllBadges();
  return badges.find(b => b.id === badgeId);
}
