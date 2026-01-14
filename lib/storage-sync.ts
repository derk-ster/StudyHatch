/**
 * Storage Sync Layer
 * 
 * Handles syncing data between localStorage (guest mode) and account storage (logged-in users)
 * 
 * TODO: Replace with real backend sync (Supabase/Firebase sync, REST API, etc.)
 * - Add online/offline detection
 * - Implement conflict resolution
 * - Add batch sync operations
 * - Add sync status indicators
 */

import { getCurrentSession } from './auth';
import { getAccountData, saveAccountData } from './auth';
import { AccountData } from '@/types/auth';
import { UserProgress, Deck } from '@/types/vocab';
import { getAllDecks as getLocalDecks, saveDeck as saveLocalDeck, deleteDeck as deleteLocalDeck, getProgress as getLocalProgress, saveProgress as saveLocalProgress } from './storage';
import { isPremium as getLocalPremium, setPremium as setLocalPremium, hasAISubscription as getLocalAISubscription, setAISubscription as setLocalAISubscription, getDailyUsage as getLocalDailyUsage } from './storage';

// Sync data from account to localStorage (when user logs in)
export function syncFromAccount(userId: string): void {
  const accountData = getAccountData(userId);
  if (!accountData) return;

  // Sync progress
  saveLocalProgress(accountData.progress);

  // Sync decks
  accountData.decks.forEach(deck => {
    saveLocalDeck(deck);
  });

  // Sync premium status
  setLocalPremium(accountData.premium);

  // Sync AI subscription
  if (accountData.aiSubscription) {
    // Set AI subscription to expire in 1 year (placeholder)
    setLocalAISubscription('active', Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
}

// Sync data from localStorage to account (when user makes changes)
export function syncToAccount(userId: string): void {
  const progress = getLocalProgress();
  const decks = getLocalDecks();
  const premium = getLocalPremium();
  const aiSubscription = getLocalAISubscription();
  const dailyUsage = getLocalDailyUsage();

  const accountData: AccountData = {
    progress,
    decks,
    favorites: [], // TODO: Track favorites
    premium,
    aiSubscription,
    dailyUsage: {
      lastReset: dailyUsage.lastReset,
      translationsToday: dailyUsage.translationsToday,
      decksCreatedToday: dailyUsage.decksCreatedToday,
      aiMessagesToday: dailyUsage.aiMessagesToday,
    },
  };

  saveAccountData(userId, accountData);
}

// Get progress (checks if logged in and syncs)
export function getProgressWithSync(): UserProgress {
  const session = getCurrentSession();
  
  if (session && !session.isGuest) {
    // Logged in: sync from account
    syncFromAccount(session.userId);
  }
  
  return getLocalProgress();
}

// Save progress (checks if logged in and syncs)
export function saveProgressWithSync(progress: UserProgress): void {
  const session = getCurrentSession();
  
  // Always save locally first (for offline support)
  saveLocalProgress(progress);
  
  if (session && !session.isGuest) {
    // Logged in: sync to account
    syncToAccount(session.userId);
  }
}

// Get decks (checks if logged in and syncs)
export function getAllDecksWithSync(): Deck[] {
  const session = getCurrentSession();
  
  if (session && !session.isGuest) {
    // Logged in: sync from account
    syncFromAccount(session.userId);
  }
  
  return getLocalDecks();
}

// Save deck (checks if logged in and syncs)
export function saveDeckWithSync(deck: Deck): void {
  const session = getCurrentSession();
  
  // Always save locally first
  saveLocalDeck(deck);
  
  if (session && !session.isGuest) {
    // Logged in: sync to account
    syncToAccount(session.userId);
  }
}

// Delete deck (checks if logged in and syncs)
export function deleteDeckWithSync(deckId: string): void {
  const session = getCurrentSession();
  
  // Always delete locally first
  deleteLocalDeck(deckId);
  
  if (session && !session.isGuest) {
    // Logged in: sync to account
    syncToAccount(session.userId);
  }
}
