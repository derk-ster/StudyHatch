'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession, User } from '@/types/auth';
import { getCurrentSession, setCurrentSession, signIn as authSignIn, signUp as authSignUp, signOut as authSignOut, continueAsGuest } from './auth';

type AuthContextType = {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load session on mount
    const currentSession = getCurrentSession();
    setSession(currentSession);
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await authSignIn(email, password);
    if (result.success && result.user) {
      const newSession: AuthSession = {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
        isGuest: false,
      };
      setCurrentSession(newSession);
      setSession(newSession);
    }
    return { success: result.success, error: result.error };
  };

  const signUp = async (email: string, username: string, password: string) => {
    const result = await authSignUp(email, username, password);
    if (result.success && result.user) {
      const newSession: AuthSession = {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
        isGuest: false,
      };
      setCurrentSession(newSession);
      setSession(newSession);
    }
    return { success: result.success, error: result.error };
  };

  const handleSignOut = () => {
    authSignOut();
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
