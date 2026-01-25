/**
 * Mock Authentication Backend
 * 
 * TODO: Replace with real backend (Supabase/Firebase/NextAuth)
 * - Replace localStorage-based user store with real database
 * - Add JWT tokens or session management
 * - Add email verification
 * - Add password reset flow
 */

import { User, AuthSession, AccountData } from '@/types/auth';
import { UserProgress, Deck } from '@/types/vocab';
import { getDefaultProgress } from './storage';
import { checkClientRateLimit, recordClientRateLimit } from './client-rate-limit';
import { sanitizeText } from './sanitize';

const USERS_STORAGE_KEY = 'studyhatch-users'; // Mock user database
const CURRENT_SESSION_KEY = 'studyhatch-session';
const LAST_SESSION_KEY = 'studyhatch-session-last';
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_COUNT = 5;

// Legacy simple hash (kept for backward compatibility)
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

type PasswordHashV2 = {
  algorithm: 'pbkdf2-sha256';
  salt: string;
  iterations: number;
  hash: string;
};

type StoredPassword = string | PasswordHashV2;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const hashPassword = async (password: string, salt?: Uint8Array): Promise<PasswordHashV2> => {
  const encoder = new TextEncoder();
  const usedSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const iterations = 120000;
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: toArrayBuffer(usedSalt), iterations, hash: 'SHA-256' },
    key,
    256
  );
  return {
    algorithm: 'pbkdf2-sha256',
    salt: toBase64(usedSalt),
    iterations,
    hash: toBase64(new Uint8Array(derivedBits)),
  };
};

const verifyPassword = async (password: string, stored: StoredPassword): Promise<{ valid: boolean; upgradeHash?: PasswordHashV2 }> => {
  if (typeof stored === 'string') {
    const legacyMatch = simpleHash(password) === stored;
    if (!legacyMatch) {
      return { valid: false };
    }
    const upgraded = await hashPassword(password);
    return { valid: true, upgradeHash: upgraded };
  }
  const encoder = new TextEncoder();
  const saltBytes = fromBase64(stored.salt);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: toArrayBuffer(saltBytes), iterations: stored.iterations, hash: 'SHA-256' },
    key,
    256
  );
  const hash = toBase64(new Uint8Array(derivedBits));
  return { valid: hash === stored.hash };
};

// Mock user database (localStorage)
function getUsers(): Record<string, { user: User; passwordHash: StoredPassword; accountData: AccountData }> {
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

function saveUsers(users: Record<string, { user: User; passwordHash: StoredPassword; accountData: AccountData }>): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

export function signUp(
  email: string,
  username: string,
  password: string,
  role: 'teacher' | 'student' = 'student'
): Promise<{ success: boolean; error?: string; user?: User }> {
  return new Promise(async (resolve) => {
    // Validation
    const safeEmail = sanitizeText(email);
    const safeUsername = sanitizeText(username);
    if (!safeEmail || !safeEmail.includes('@')) {
      resolve({ success: false, error: 'Invalid email address' });
      return;
    }
    
    if (!safeUsername || safeUsername.length < 3) {
      resolve({ success: false, error: 'Username must be at least 3 characters' });
      return;
    }
    
    if (!password || password.length < 6) {
      resolve({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }
    
    const users = getUsers();
    const emailLower = safeEmail.toLowerCase().trim();
    
    // Check if user exists
    const existingUser = Object.values(users).find(u => u.user.email.toLowerCase() === emailLower);
    if (existingUser) {
      resolve({ success: false, error: 'An account with this email already exists' });
      return;
    }
    
    const existingUsername = Object.values(users).find(u => u.user.username.toLowerCase() === safeUsername.toLowerCase().trim());
    if (existingUsername) {
      resolve({ success: false, error: 'Username already taken' });
      return;
    }
    
    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser: User = {
      id: userId,
      email: emailLower,
      username: safeUsername.trim(),
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      classroomIds: [],
      role,
    };
    
    const passwordHash = await hashPassword(password);
    
    // Initialize account data
    const accountData: AccountData = {
      progress: getDefaultProgress(),
      decks: [],
      favorites: [],
      premium: role === 'teacher',
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
  return new Promise(async (resolve) => {
    const users = getUsers();
    const input = sanitizeText(emailOrUsername).toLowerCase().trim();
    const rateLimit = checkClientRateLimit(`login-${input}`, LOGIN_RATE_LIMIT_COUNT, LOGIN_RATE_LIMIT_WINDOW);
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(rateLimit.retryAfterMs / 60000);
      resolve({ success: false, error: `Too many login attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` });
      return;
    }
    
    // Try to find user by email OR username
    const userEntry = Object.values(users).find(
      u => (u.user.email.toLowerCase() === input || u.user.username.toLowerCase() === input)
    );
    
    if (!userEntry) {
      recordClientRateLimit(`login-${input}`, LOGIN_RATE_LIMIT_WINDOW);
      resolve({ success: false, error: 'Invalid email/username or password' });
      return;
    }

    const passwordCheck = await verifyPassword(password, userEntry.passwordHash);
    if (!passwordCheck.valid) {
      recordClientRateLimit(`login-${input}`, LOGIN_RATE_LIMIT_WINDOW);
      resolve({ success: false, error: 'Invalid email/username or password' });
      return;
    }
    
    // Update last login
    userEntry.user.lastLoginAt = Date.now();
    if (!userEntry.user.role) {
      userEntry.user.role = 'student';
    }
    if (userEntry.user.role === 'teacher' && !userEntry.accountData.premium) {
      userEntry.accountData.premium = true;
    }
    if (passwordCheck.upgradeHash) {
      userEntry.passwordHash = passwordCheck.upgradeHash;
    }
    users[userEntry.user.id] = userEntry;
    saveUsers(users);
    
    resolve({ success: true, user: userEntry.user });
  });
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CURRENT_SESSION_KEY);
  localStorage.removeItem(LAST_SESSION_KEY);
}

export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(CURRENT_SESSION_KEY) || localStorage.getItem(LAST_SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored) as AuthSession;
      if (session?.userId) {
        const user = getUserById(session.userId);
        if (user) {
          const updatedSession: AuthSession = {
            ...session,
            role: user.role || session.role || 'student',
            schoolId: user.schoolId ?? session.schoolId,
          };
          if (updatedSession.role !== session.role || updatedSession.schoolId !== session.schoolId) {
            setCurrentSession(updatedSession);
          }
          return updatedSession;
        }
      }
      return session;
    }
  } catch (error) {
    console.error('Error loading session:', error);
  }
  
  return null;
}

export function setCurrentSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') return;
  
  if (session) {
    sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(CURRENT_SESSION_KEY);
    localStorage.removeItem(LAST_SESSION_KEY);
  }
}

export function continueAsGuest(): AuthSession {
  const guestSession: AuthSession = {
    userId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: '',
    username: 'Guest',
    isGuest: true,
    role: 'guest',
  };
  
  setCurrentSession(guestSession);
  return guestSession;
}

export function getAccountData(userId: string): AccountData | null {
  const users = getUsers();
  const userEntry = users[userId];
  return userEntry ? userEntry.accountData : null;
}

export function getUserById(userId: string): User | null {
  const users = getUsers();
  return users[userId]?.user || null;
}

export function setUserSchool(userId: string, schoolId: string): void {
  const users = getUsers();
  const userEntry = users[userId];
  if (!userEntry) return;
  userEntry.user.schoolId = schoolId;
  saveUsers(users);
}

export function addUserClassroom(userId: string, classroomId: string): void {
  const users = getUsers();
  const userEntry = users[userId];
  if (!userEntry) return;
  const existing = userEntry.user.classroomIds || [];
  if (!existing.includes(classroomId)) {
    userEntry.user.classroomIds = [...existing, classroomId];
    saveUsers(users);
  }
}

export function removeUserClassroom(userId: string, classroomId: string): void {
  const users = getUsers();
  const userEntry = users[userId];
  if (!userEntry) return;
  userEntry.user.classroomIds = (userEntry.user.classroomIds || []).filter(id => id !== classroomId);
  saveUsers(users);
}

export function removeClassroomFromAllUsers(classroomId: string): void {
  const users = getUsers();
  Object.values(users).forEach(entry => {
    entry.user.classroomIds = (entry.user.classroomIds || []).filter(id => id !== classroomId);
  });
  saveUsers(users);
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
  return new Promise(async (resolve) => {
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
    
    const passwordCheck = await verifyPassword(oldPassword, userEntry.passwordHash);
    if (!passwordCheck.valid) {
      resolve({ success: false, error: 'Current password is incorrect' });
      return;
    }
    
    userEntry.passwordHash = await hashPassword(newPassword);
    saveUsers(users);
    
    resolve({ success: true });
  });
}
