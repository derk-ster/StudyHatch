/**
 * Mock Authentication Backend
 * 
 * TODO: Replace with real backend (Supabase/Firebase/NextAuth)
 * - Replace localStorage-based user store with real database
 * - Implement secure password hashing (bcrypt, argon2)
 * - Add JWT tokens or session management
 * - Add email verification
 * - Add password reset flow
 */

import { User, AuthSession, AccountData } from '@/types/auth';
import { UserProgress, Deck } from '@/types/vocab';
import { getDefaultProgress } from './storage';

const USERS_STORAGE_KEY = 'studyhatch-users'; // Mock user database
const CURRENT_SESSION_KEY = 'studyhatch-session';

// Simple password hashing (NOT SECURE - replace with bcrypt in production)
function simpleHash(password: string): string {
  // TODO: Use bcrypt or similar in production
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Mock user database (localStorage)
function getUsers(): Record<string, { user: User; passwordHash: string; accountData: AccountData }> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  
  return {};
}

function saveUsers(users: Record<string, { user: User; passwordHash: string; accountData: AccountData }>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

export function signUp(email: string, username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
  return new Promise((resolve) => {
    // Validation
    if (!email || !email.includes('@')) {
      resolve({ success: false, error: 'Invalid email address' });
      return;
    }
    
    if (!username || username.length < 3) {
      resolve({ success: false, error: 'Username must be at least 3 characters' });
      return;
    }
    
    if (!password || password.length < 6) {
      resolve({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }
    
    const users = getUsers();
    const emailLower = email.toLowerCase().trim();
    
    // Check if user exists
    const existingUser = Object.values(users).find(u => u.user.email.toLowerCase() === emailLower);
    if (existingUser) {
      resolve({ success: false, error: 'An account with this email already exists' });
      return;
    }
    
    const existingUsername = Object.values(users).find(u => u.user.username.toLowerCase() === username.toLowerCase().trim());
    if (existingUsername) {
      resolve({ success: false, error: 'Username already taken' });
      return;
    }
    
    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser: User = {
      id: userId,
      email: emailLower,
      username: username.trim(),
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    
    const passwordHash = simpleHash(password);
    
    // Initialize account data
    const accountData: AccountData = {
      progress: getDefaultProgress(),
      decks: [],
      favorites: [],
      premium: false,
      aiSubscription: false,
      dailyUsage: {
        lastReset: Date.now(),
        translationsToday: 0,
        decksCreatedToday: 0,
        aiMessagesToday: 0,
      },
    };
    
    users[userId] = {
      user: newUser,
      passwordHash,
      accountData,
    };
    
    saveUsers(users);
    
    resolve({ success: true, user: newUser });
  });
}

export function signIn(emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
  return new Promise((resolve) => {
    const users = getUsers();
    const input = emailOrUsername.toLowerCase().trim();
    const passwordHash = simpleHash(password);
    
    // Try to find user by email OR username
    const userEntry = Object.values(users).find(
      u => (u.user.email.toLowerCase() === input || u.user.username.toLowerCase() === input) && u.passwordHash === passwordHash
    );
    
    if (!userEntry) {
      resolve({ success: false, error: 'Invalid email/username or password' });
      return;
    }
    
    // Update last login
    userEntry.user.lastLoginAt = Date.now();
    users[userEntry.user.id] = userEntry;
    saveUsers(users);
    
    resolve({ success: true, user: userEntry.user });
  });
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_SESSION_KEY);
}

export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CURRENT_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading session:', error);
  }
  
  return null;
}

export function setCurrentSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  
  if (session) {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

export function continueAsGuest(): AuthSession {
  const guestSession: AuthSession = {
    userId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: '',
    username: 'Guest',
    isGuest: true,
  };
  
  setCurrentSession(guestSession);
  return guestSession;
}

export function getAccountData(userId: string): AccountData | null {
  const users = getUsers();
  const userEntry = users[userId];
  return userEntry ? userEntry.accountData : null;
}

export function saveAccountData(userId: string, accountData: AccountData): void {
  const users = getUsers();
  const userEntry = users[userId];
  if (userEntry) {
    userEntry.accountData = accountData;
    saveUsers(users);
  }
}

export function updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!newPassword || newPassword.length < 6) {
      resolve({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }
    
    const users = getUsers();
    const userEntry = users[userId];
    
    if (!userEntry) {
      resolve({ success: false, error: 'User not found' });
      return;
    }
    
    const oldPasswordHash = simpleHash(oldPassword);
    if (userEntry.passwordHash !== oldPasswordHash) {
      resolve({ success: false, error: 'Current password is incorrect' });
      return;
    }
    
    userEntry.passwordHash = simpleHash(newPassword);
    saveUsers(users);
    
    resolve({ success: true });
  });
}
