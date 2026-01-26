/**
 * XP and Level System
 * 
 * Tracks experience points and level progression
 */

import { getProgress, saveProgress, getDailyUsage, saveDailyUsage } from './storage';

const XP_PER_LEVEL = 100; // Base XP needed per level
const LEVEL_SCALING = 1.5; // XP multiplier per level

// Calculate level from XP
export function getLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  
  let level = 1;
  let totalXPNeeded = 0;
  
  while (true) {
    const xpForThisLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, level - 1));
    totalXPNeeded += xpForThisLevel;
    
    if (xp < totalXPNeeded) {
      return level;
    }
    
    level++;
    
    // Cap at level 100
    if (level > 100) return 100;
  }
}

// Calculate XP needed for next level
export function getXPForNextLevel(xp: number): number {
  const currentLevel = getLevelFromXP(xp);
  if (currentLevel >= 100) return 0; // Max level
  
  let totalXPNeeded = 0;
  for (let i = 1; i <= currentLevel; i++) {
    totalXPNeeded += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, i - 1));
  }
  
  const xpForNextLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, currentLevel));
  const xpIntoCurrentLevel = xp - (totalXPNeeded - Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, currentLevel - 1)));
  
  return Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, currentLevel - 1)) - xpIntoCurrentLevel;
}

// Calculate progress to next level (0-1)
export function getProgressToNextLevel(xp: number): number {
  const currentLevel = getLevelFromXP(xp);
  if (currentLevel >= 100) return 1; // Max level
  
  let totalXPNeeded = 0;
  for (let i = 1; i < currentLevel; i++) {
    totalXPNeeded += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, i - 1));
  }
  
  const xpForCurrentLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_SCALING, currentLevel - 1));
  const xpIntoCurrentLevel = xp - totalXPNeeded;
  
  return Math.max(0, Math.min(1, xpIntoCurrentLevel / xpForCurrentLevel));
}

// Add XP to user's progress
export function addXP(amount: number, deckId?: string): { newXP: number; newLevel: number; levelUp: boolean } {
  const progress = getProgress();
  const currentXP = progress.xp || 0;
  const currentLevel = progress.level || getLevelFromXP(currentXP);

  const newXP = currentXP + amount;
  const newLevel = getLevelFromXP(newXP);
  const levelUp = newLevel > currentLevel;

  progress.xp = newXP;
  progress.level = newLevel;

  if (deckId) {
    if (!progress.deckProgress) {
      progress.deckProgress = {};
    }
    if (!progress.deckProgress[deckId]) {
      progress.deckProgress[deckId] = {
        starredCards: [],
        knownCards: [],
        learningCards: [],
        cardStats: {},
        matchBestTime: undefined,
        quizHighScore: undefined,
        quizStreak: 0,
        xpEarned: 0,
      };
    }
    progress.deckProgress[deckId].xpEarned = (progress.deckProgress[deckId].xpEarned || 0) + amount;
  }

  saveProgress(progress);

  const usage = getDailyUsage();
  usage.xpToday = (usage.xpToday || 0) + amount;
  saveDailyUsage(usage);

  return { newXP, newLevel, levelUp };
}

// Get XP info
export function getXPInfo(): { xp: number; level: number; progressToNext: number; xpForNextLevel: number; xpToday: number } {
  const progress = getProgress();
  const xp = progress.xp || 0;
  const level = progress.level || getLevelFromXP(xp);
  const progressToNext = getProgressToNextLevel(xp);
  const xpForNextLevel = getXPForNextLevel(xp);
  const usage = getDailyUsage();
  const xpToday = usage.xpToday || 0;
  
  return {
    xp,
    level,
    progressToNext,
    xpForNextLevel,
    xpToday,
  };
}

export function getDeckXP(deckId: string): number {
  const progress = getProgress();
  return progress.deckProgress?.[deckId]?.xpEarned || 0;
}

// Award XP for different activities
export const XP_REWARDS = {
  STUDY_CARD: 5, // Per card studied
  DECK_CREATED: 50,
  STREAK_DAY: 10, // Per day of streak
  QUIZ_PERFECT: 25,
  MATCH_BEST_TIME: 15,
  CORRECT_ANSWER: 5,
} as const;
