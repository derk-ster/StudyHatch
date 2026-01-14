export type VocabCard = {
  id: string;
  translation: string; // Translation in target language (previously "spanish")
  english: string;
  example?: string;
  category?: string;
  notes?: string;
};

export type Deck = {
  id: string;
  name: string;
  description?: string;
  cards: VocabCard[];
  createdDate: number; // timestamp
  targetLanguage: string; // Language code (e.g., 'es', 'fr', 'zh')
};

export type Language = {
  code: string;
  name: string;
  flag?: string;
};

export type StudyMode = 'general' | 'tech';

export type ActivityType = 'flashcards' | 'learn' | 'match' | 'quiz' | 'write' | 'scramble';

export type UserProgress = {
  starredCards: string[]; // Deprecated - use per-deck progress
  knownCards: string[]; // Deprecated - use per-deck progress
  learningCards: string[]; // Deprecated - use per-deck progress
  cardStats: Record<string, {
    correct: number;
    incorrect: number;
    lastSeen?: number;
  }>; // Deprecated - use per-deck progress
  matchBestTime?: number; // Deprecated - use per-deck progress
  quizHighScore?: number; // Deprecated - use per-deck progress
  quizStreak?: number; // Deprecated - use per-deck progress
  lastMode?: StudyMode; // Deprecated
  lastDeck?: string;
  lastActivity?: ActivityType;
  // New per-deck progress structure
  deckProgress?: Record<string, {
    starredCards: string[];
    knownCards: string[];
    learningCards: string[];
    cardStats: Record<string, {
      correct: number;
      incorrect: number;
      lastSeen?: number;
    }>;
    matchBestTime?: number;
    quizHighScore?: number;
    quizStreak?: number;
  }>;
  // Streak and pet system
  dailyStreak?: number; // Current consecutive days streak
  lastStudyDate?: number; // Last date user studied (timestamp)
  petStage?: PetStage; // Current pet evolution stage
  // XP and progression
  xp?: number; // Total experience points
  level?: number; // Current level (derived from XP)
  // Badges and achievements
  badges?: Badge[];
  languagePreferences?: string[]; // Preferred languages
};

export type PetStage = 'egg' | 'baby' | 'child' | 'evolved';

export type Badge = {
  id: string;
  name: string;
  description: string;
  earnedAt: number; // timestamp
  icon?: string;
};
