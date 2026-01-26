/**
 * Streak Tracking System
 * 
 * Tracks daily study streaks and pet evolution
 */

import { PetStage, UserProgress } from '@/types/vocab';
import { getProgress, saveProgress } from './storage';

// Pet evolution thresholds
const PET_STAGES: { stage: PetStage; minStreak: number }[] = [
  { stage: 'egg', minStreak: 0 },
  { stage: 'baby', minStreak: 4 },
  { stage: 'child', minStreak: 11 },
  { stage: 'evolved', minStreak: 31 },
];

export function getPetStage(streak: number): PetStage {
  for (let i = PET_STAGES.length - 1; i >= 0; i--) {
    if (streak >= PET_STAGES[i].minStreak) {
      return PET_STAGES[i].stage;
    }
  }
  return 'egg';
}

export function getNextEvolutionStreak(streak: number): number {
  const currentStage = getPetStage(streak);
  const currentIndex = PET_STAGES.findIndex(s => s.stage === currentStage);
  
  if (currentIndex < PET_STAGES.length - 1) {
    return PET_STAGES[currentIndex + 1].minStreak;
  }
  
  return Infinity; // Already at max stage
}

export function getProgressToNextEvolution(streak: number): number {
  const nextStreak = getNextEvolutionStreak(streak);
  if (nextStreak === Infinity) return 1; // Max stage
  
  const currentStage = getPetStage(streak);
  const currentMinStreak = PET_STAGES.find(s => s.stage === currentStage)?.minStreak || 0;
  
  const progress = (streak - currentMinStreak) / (nextStreak - currentMinStreak);
  return Math.max(0, Math.min(1, progress));
}

// Check if user studied today
function studiedToday(progress: UserProgress): boolean {
  if (!progress.lastStudyDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastStudy = new Date(progress.lastStudyDate);
  lastStudy.setHours(0, 0, 0, 0);
  
  return lastStudy.getTime() === today.getTime();
}

// Check if user studied yesterday
function studiedYesterday(progress: UserProgress): boolean {
  if (!progress.lastStudyDate) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const lastStudy = new Date(progress.lastStudyDate);
  lastStudy.setHours(0, 0, 0, 0);
  
  return lastStudy.getTime() === yesterday.getTime();
}

// Update streak when user studies
export function updateStreakOnStudy(): { streakUpdated: boolean; newStreak: number; petEvolved: boolean } {
  const progress = getProgress();
  const currentStreak = progress.dailyStreak || 0;
  const currentPetStage = progress.petStage || 'egg';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastStudyDate = progress.lastStudyDate ? new Date(progress.lastStudyDate) : null;
  
  let newStreak = currentStreak;
  let streakUpdated = false;
  
  if (!lastStudyDate) {
    // First time studying
    newStreak = 1;
    streakUpdated = true;
  } else {
    const lastStudy = new Date(lastStudyDate);
    lastStudy.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Already studied today - no change
      newStreak = currentStreak;
    } else if (daysDiff === 1) {
      // Studied yesterday - continue streak
      newStreak = currentStreak + 1;
      streakUpdated = true;
    } else {
      // Missed a day - reset streak
      newStreak = 1;
      streakUpdated = true;
    }
  }
  
  const newPetStage = getPetStage(newStreak);
  const petEvolved = newPetStage !== currentPetStage && newStreak > currentStreak;
  
  if (streakUpdated) {
    progress.dailyStreak = newStreak;
    progress.lastStudyDate = today.getTime();
    progress.petStage = newPetStage;
    saveProgress(progress);
  }
  
  return { streakUpdated, newStreak, petEvolved };
}

// Get current streak info
export function getStreakInfo(): { streak: number; petStage: PetStage; progressToNext: number; nextEvolutionStreak: number } {
  const progress = getProgress();
  const streak = progress.dailyStreak || 0;
  const petStage = progress.petStage || getPetStage(streak);
  const progressToNext = getProgressToNextEvolution(streak);
  const nextEvolutionStreak = getNextEvolutionStreak(streak);
  
  return {
    streak,
    petStage,
    progressToNext,
    nextEvolutionStreak,
  };
}
