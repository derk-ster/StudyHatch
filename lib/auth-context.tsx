'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession, getSession } from 'next-auth/react';
import { AuthSession } from '@/types/auth';
import { getCurrentSession, setCurrentSession, signOut as authSignOut, continueAsGuest } from './auth';

type AuthContextType = {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; userId?: string }>;
  signUp: (
    email: string,
    username: string,
    password: string,
    role: 'teacher' | 'student',
    options?: { schoolName?: string; schoolDescription?: string; classCode?: string }
  ) => Promise<{ success: boolean; error?: string; userId?: string }>;
  signOut: () => void;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: nextAuthSession, status } = useSession();

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    if (nextAuthSession?.user?.id) {
      const newSession: AuthSession = {
        userId: nextAuthSession.user.id,
        email: nextAuthSession.user.email || '',
        username: nextAuthSession.user.username || nextAuthSession.user.name || '',
        isGuest: false,
        role: (nextAuthSession.user.role as AuthSession['role']) || 'student',
      };
      setCurrentSession(newSession);
      setSession(newSession);
      setIsLoading(false);
      return;
    }
    const storedSession = getCurrentSession();
    setSession(storedSession);
    setIsLoading(false);
  }, [nextAuthSession, status]);

  const signIn = async (email: string, password: string) => {
    const response = await nextAuthSignIn('credentials', {
      redirect: false,
      identifier: email,
      password,
    });
    if (response?.error) {
      const message = response.error === 'CredentialsSignin'
        ? 'Invalid email/username or password'
        : response.error;
      return { success: false, error: message };
    }
    const updatedSession = await getSession();
    if (updatedSession?.user?.id) {
      const newSession: AuthSession = {
        userId: updatedSession.user.id,
        email: updatedSession.user.email || email,
        username: updatedSession.user.username || updatedSession.user.name || '',
        isGuest: false,
        role: (updatedSession.user.role as AuthSession['role']) || 'student',
      };
      setCurrentSession(newSession);
      setSession(newSession);
      return { success: true, userId: newSession.userId };
    }
    return { success: true };
  };

  const signUp = async (
    email: string,
    username: string,
    password: string,
    role: 'teacher' | 'student',
    options?: { schoolName?: string; schoolDescription?: string; classCode?: string }
  ) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        password,
        role,
        schoolName: options?.schoolName,
        schoolDescription: options?.schoolDescription,
        classCode: options?.classCode,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || 'Sign up failed' };
    }
    await nextAuthSignIn('credentials', {
      redirect: false,
      identifier: email,
      password,
    });
    const updatedSession = await getSession();
    if (updatedSession?.user?.id) {
      const newSession: AuthSession = {
        userId: updatedSession.user.id,
        email: updatedSession.user.email || email,
        username: updatedSession.user.username || updatedSession.user.name || username,
        isGuest: false,
        role: (updatedSession.user.role as AuthSession['role']) || role,
      };
      setCurrentSession(newSession);
      setSession(newSession);
      return { success: true, userId: newSession.userId };
    }
    return { success: true };
  };

  const handleSignOut = () => {
    authSignOut();
    nextAuthSignOut({ redirect: false });
    setSession(null);
  };

  const handleContinueAsGuest = () => {
    const guestSession = continueAsGuest();
    setSession(guestSession);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        signIn,
        signUp,
        signOut: handleSignOut,
        continueAsGuest: handleContinueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
