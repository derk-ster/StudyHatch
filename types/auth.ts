export type User = {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  lastLoginAt: number;
};

export type AuthSession = {
  userId: string;
  email: string;
  username: string;
  isGuest: boolean;
};

export type AuthState = {
  session: AuthSession | null;
  isLoading: boolean;
};

export type AccountData = {
  progress: import('@/types/vocab').UserProgress;
  decks: import('@/types/vocab').Deck[];
  favorites: string[]; // deck IDs
  premium: boolean;
  aiSubscription: boolean;
  dailyUsage: {
    lastReset: number;
    translationsToday: number;
    decksCreatedToday: number;
    aiMessagesToday: number;
  };
};
