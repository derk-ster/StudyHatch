import { UserProgress, StudyMode, ActivityType, Deck, VocabCard } from '@/types/vocab';

const STORAGE_KEY = 'spanish-vocab-progress';
const DECKS_STORAGE_KEY = 'spanish-vocab-decks';

export const getProgress = (): UserProgress => {
  if (typeof window === 'undefined') {
    return getDefaultProgress();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
  
  return getDefaultProgress();
};

export const saveProgress = (progress: UserProgress): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
};

export const updateProgress = (updates: Partial<UserProgress>): void => {
  const current = getProgress();
  const updated = { ...current, ...updates };
  saveProgress(updated);
};

export const resetProgress = (): void => {
  saveProgress(getDefaultProgress());
};

export const getDefaultProgress = (): UserProgress => ({
  starredCards: [],
  knownCards: [],
  learningCards: [],
  cardStats: {},
  matchBestTime: undefined,
  quizHighScore: undefined,
  quizStreak: 0,
  lastMode: 'general',
  lastDeck: undefined,
  lastActivity: undefined,
});

const FLASHCARD_POSITION_KEY = 'spanish-vocab-flashcard-positions';

export const getFlashcardPosition = (deckId: string): number => {
  if (typeof window === 'undefined') return 0;
  
  try {
    const stored = localStorage.getItem(FLASHCARD_POSITION_KEY);
    if (stored) {
      const positions = JSON.parse(stored);
      return positions[deckId] ?? 0;
    }
  } catch (error) {
    console.error('Error loading flashcard position:', error);
  }
  
  return 0;
};

export const saveFlashcardPosition = (deckId: string, index: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(FLASHCARD_POSITION_KEY);
    const positions = stored ? JSON.parse(stored) : {};
    positions[deckId] = index;
    localStorage.setItem(FLASHCARD_POSITION_KEY, JSON.stringify(positions));
  } catch (error) {
    console.error('Error saving flashcard position:', error);
  }
};

export const starCard = (cardId: string): void => {
  const progress = getProgress();
  if (progress.starredCards.includes(cardId)) {
    progress.starredCards = progress.starredCards.filter(id => id !== cardId);
  } else {
    progress.starredCards.push(cardId);
  }
  saveProgress(progress);
};

export const markCardKnown = (cardId: string): void => {
  const progress = getProgress();
  if (progress.knownCards.includes(cardId)) {
    progress.knownCards = progress.knownCards.filter(id => id !== cardId);
  } else {
    progress.knownCards.push(cardId);
    progress.learningCards = progress.learningCards.filter(id => id !== cardId);
  }
  saveProgress(progress);
};

export const markCardLearning = (cardId: string): void => {
  const progress = getProgress();
  if (!progress.learningCards.includes(cardId)) {
    progress.learningCards.push(cardId);
  }
  progress.knownCards = progress.knownCards.filter(id => id !== cardId);
  saveProgress(progress);
};

export const recordCardAttempt = (cardId: string, correct: boolean): void => {
  const progress = getProgress();
  if (!progress.cardStats[cardId]) {
    progress.cardStats[cardId] = { correct: 0, incorrect: 0 };
  }
  
  if (correct) {
    progress.cardStats[cardId].correct++;
  } else {
    progress.cardStats[cardId].incorrect++;
  }
  
  progress.cardStats[cardId].lastSeen = Date.now();
  saveProgress(progress);
};

export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
};

export const fuzzyMatch = (input: string, target: string): boolean => {
  const normalizedInput = normalizeText(input);
  const normalizedTarget = normalizeText(target);
  
  // Exact match
  if (normalizedInput === normalizedTarget) return true;
  
  // Check if input is close to target (allowing for small typos)
  if (normalizedTarget.includes(normalizedInput) || normalizedInput.includes(normalizedTarget)) {
    return true;
  }
  
  // Levenshtein distance check for small differences
  const distance = levenshteinDistance(normalizedInput, normalizedTarget);
  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);
  const similarity = 1 - distance / maxLength;
  
  return similarity >= 0.85; // 85% similarity threshold
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Deck Storage Functions
export const getAllDecks = (): Deck[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(DECKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading decks:', error);
  }
  
  return [];
};

export const saveDeck = (deck: Deck): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const decks = getAllDecks();
    const existingIndex = decks.findIndex(d => d.id === deck.id);
    
    // Ensure targetLanguage exists (backward compatibility)
    const deckToSave = {
      ...deck,
      targetLanguage: deck.targetLanguage || 'es', // Default to Spanish for old decks
    };
    
    if (existingIndex >= 0) {
      decks[existingIndex] = deckToSave;
    } else {
      decks.push(deckToSave);
    }
    
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
  } catch (error) {
    console.error('Error saving deck:', error);
  }
};

export const deleteDeck = (deckId: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const decks = getAllDecks();
    const filtered = decks.filter(d => d.id !== deckId);
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(filtered));
    
    // Also clear progress for this deck
    const progress = getProgress();
    if (progress.deckProgress) {
      delete progress.deckProgress[deckId];
      saveProgress(progress);
    }
  } catch (error) {
    console.error('Error deleting deck:', error);
  }
};

export const getDeckById = (deckId: string): Deck | undefined => {
  const decks = getAllDecks();
  const deck = decks.find(d => d.id === deckId);
  
  // Backward compatibility: ensure targetLanguage exists
  if (deck && !deck.targetLanguage) {
    deck.targetLanguage = 'es'; // Default to Spanish for old decks
    // Also migrate old cards from spanish to translation field
    deck.cards = deck.cards.map(card => {
      if ('spanish' in card && !('translation' in card)) {
        return {
          ...card,
          translation: (card as any).spanish,
        } as VocabCard;
      }
      return card;
    });
    // Save the migrated deck
    saveDeck(deck);
  }
  
  return deck;
};

// Check if user is premium (for limits)
export const isPremium = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const premium = localStorage.getItem('spanish-vocab-premium');
    return premium === 'true';
  } catch (error) {
    return false;
  }
};

// Set premium status
export const setPremium = (isPremium: boolean): void => {
  if (typeof window === 'undefined') return;
  
  try {
    if (isPremium) {
      localStorage.setItem('spanish-vocab-premium', 'true');
    } else {
      localStorage.removeItem('spanish-vocab-premium');
    }
  } catch (error) {
    console.error('Error setting premium status:', error);
  }
};

// Check if user has AI subscription
export const hasAISubscription = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const subscription = localStorage.getItem('ai-chat-subscription');
    if (!subscription) return false;
    
    const subData = JSON.parse(subscription);
    // Check if subscription is active and not expired
    if (subData.status === 'active' && subData.expiresAt > Date.now()) {
      return true;
    }
    // If expired, clear it
    if (subData.expiresAt <= Date.now()) {
      localStorage.removeItem('ai-chat-subscription');
      return false;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Get subscription expiration info
export const getSubscriptionInfo = (): { 
  isActive: boolean; 
  daysRemaining: number; 
  expiresAt: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean; // Expires in 7 days or less
} => {
  if (typeof window === 'undefined') {
    return { isActive: false, daysRemaining: 0, expiresAt: null, isExpired: false, isExpiringSoon: false };
  }
  
  try {
    const subscription = localStorage.getItem('ai-chat-subscription');
    if (!subscription) {
      return { isActive: false, daysRemaining: 0, expiresAt: null, isExpired: false, isExpiringSoon: false };
    }
    
    const subData = JSON.parse(subscription);
    const now = Date.now();
    const expiresAt = subData.expiresAt;
    
    if (subData.status !== 'active' || !expiresAt) {
      return { isActive: false, daysRemaining: 0, expiresAt: null, isExpired: true, isExpiringSoon: false };
    }
    
    if (expiresAt <= now) {
      // Expired - clear it
      localStorage.removeItem('ai-chat-subscription');
      return { isActive: false, daysRemaining: 0, expiresAt: null, isExpired: true, isExpiringSoon: false };
    }
    
    const daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    const isExpiringSoon = daysRemaining <= 7;
    
    return {
      isActive: true,
      daysRemaining,
      expiresAt,
      isExpired: false,
      isExpiringSoon,
    };
  } catch (error) {
    return { isActive: false, daysRemaining: 0, expiresAt: null, isExpired: false, isExpiringSoon: false };
  }
};

// Set AI subscription status
export const setAISubscription = (status: 'active' | 'cancelled', expiresAt: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('ai-chat-subscription', JSON.stringify({
      status,
      expiresAt,
      createdAt: Date.now(),
    }));
  } catch (error) {
    console.error('Error saving AI subscription:', error);
  }
};

// Cancel AI subscription
export const cancelAISubscription = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const subscription = localStorage.getItem('ai-chat-subscription');
    if (subscription) {
      const subData = JSON.parse(subscription);
      subData.status = 'cancelled';
      subData.cancelledAt = Date.now();
      localStorage.setItem('ai-chat-subscription', JSON.stringify(subData));
    }
  } catch (error) {
    console.error('Error cancelling AI subscription:', error);
  }
};

// Daily usage tracking
const DAILY_USAGE_KEY = 'spanish-vocab-daily-usage';
const DAILY_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export type DailyUsage = {
  lastReset: number; // timestamp
  translationsToday: number; // number of words translated today
  decksCreatedToday: number; // number of decks created today
  aiMessagesToday: number; // number of AI chat messages sent today
};

export const getDailyUsage = (): DailyUsage => {
  if (typeof window === 'undefined') {
    return { lastReset: Date.now(), translationsToday: 0, decksCreatedToday: 0, aiMessagesToday: 0 };
  }
  
  try {
    const stored = localStorage.getItem(DAILY_USAGE_KEY);
    if (stored) {
      const usage: DailyUsage = JSON.parse(stored);
      const now = Date.now();
      const timeSinceReset = now - usage.lastReset;
      
      // Reset if 24 hours have passed
      if (timeSinceReset >= DAILY_RESET_INTERVAL) {
        const resetUsage: DailyUsage = {
          lastReset: now,
          translationsToday: 0,
          decksCreatedToday: 0,
          aiMessagesToday: 0,
        };
        localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(resetUsage));
        return resetUsage;
      }
      
      // Ensure aiMessagesToday exists for backward compatibility
      if (usage.aiMessagesToday === undefined) {
        usage.aiMessagesToday = 0;
      }
      
      return usage;
    }
  } catch (error) {
    console.error('Error loading daily usage:', error);
  }
  
  return { lastReset: Date.now(), translationsToday: 0, decksCreatedToday: 0, aiMessagesToday: 0 };
};

export const saveDailyUsage = (usage: DailyUsage): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(DAILY_USAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.error('Error saving daily usage:', error);
  }
};

export const incrementDailyTranslations = (count: number): void => {
  const usage = getDailyUsage();
  usage.translationsToday += count;
  saveDailyUsage(usage);
};

export const incrementDailyDecks = (): void => {
  const usage = getDailyUsage();
  usage.decksCreatedToday += 1;
  saveDailyUsage(usage);
};

export const incrementDailyAIMessages = (): void => {
  const usage = getDailyUsage();
  usage.aiMessagesToday = (usage.aiMessagesToday || 0) + 1;
  saveDailyUsage(usage);
};

export const getTimeUntilReset = (): number => {
  const usage = getDailyUsage();
  const now = Date.now();
  const timeSinceReset = now - usage.lastReset;
  const timeUntilReset = DAILY_RESET_INTERVAL - timeSinceReset;
  return Math.max(0, timeUntilReset);
};

// Get user limits
export const getUserLimits = () => {
  const premium = isPremium();
  return {
    maxDecks: premium ? Infinity : 5, // Free users: 5 decks
    maxCards: premium ? Infinity : 100,
    dailyTranslationLimit: premium ? Infinity : 50, // Free users: 50 words per day
    dailyDeckLimit: premium ? Infinity : 1, // Free users: 1 deck per day
    dailyAILimit: hasAISubscription() ? Infinity : 5, // Free users: 5 AI messages per day
  };
};

// Check if user can create more decks
export const canCreateDeck = (): { allowed: boolean; reason?: string } => {
  const limits = getUserLimits();
  const decks = getAllDecks();
  const dailyUsage = getDailyUsage();
  
  // Check total deck limit
  if (decks.length >= limits.maxDecks) {
    return {
      allowed: false,
      reason: `Free users can only create ${limits.maxDecks} decks. Upgrade to Premium for unlimited decks.`,
    };
  }
  
  // Check daily deck limit
  if (dailyUsage.decksCreatedToday >= limits.dailyDeckLimit) {
    const timeUntilReset = getTimeUntilReset();
    const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Free users can only create ${limits.dailyDeckLimit} deck per day. Daily limit resets in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}. Upgrade to Premium for unlimited daily creation.`,
    };
  }
  
  return { allowed: true };
};

// Check if user can add more cards to a deck
export const canAddCards = (deckId: string, newCardCount: number): { allowed: boolean; reason?: string } => {
  const limits = getUserLimits();
  const deck = getDeckById(deckId);
  const dailyUsage = getDailyUsage();
  
  if (!deck) {
    return { allowed: false, reason: 'Deck not found' };
  }
  
  // Check total card limit
  const totalCards = getAllDecks().reduce((sum, d) => sum + d.cards.length, 0);
  const newTotal = totalCards - deck.cards.length + newCardCount;
  
  if (newTotal > limits.maxCards) {
    return {
      allowed: false,
      reason: `Free users can only have ${limits.maxCards} total cards. Upgrade to Premium for unlimited cards.`,
    };
  }
  
  // Check daily translation limit
  if (dailyUsage.translationsToday + newCardCount > limits.dailyTranslationLimit) {
    const remaining = limits.dailyTranslationLimit - dailyUsage.translationsToday;
    const timeUntilReset = getTimeUntilReset();
    const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Free users can only translate ${limits.dailyTranslationLimit} words per day. You have ${remaining} remaining today. Daily limit resets in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}. Upgrade to Premium for unlimited daily translations.`,
    };
  }
  
  return { allowed: true };
};

// Check if user can send AI message
export const canSendAIMessage = (): { allowed: boolean; reason?: string } => {
  const limits = getUserLimits();
  const dailyUsage = getDailyUsage();
  const hasSubscription = hasAISubscription();
  
  if (hasSubscription) {
    return { allowed: true };
  }
  
  if ((dailyUsage.aiMessagesToday || 0) >= limits.dailyAILimit) {
    const timeUntilReset = getTimeUntilReset();
    const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Free users can only send ${limits.dailyAILimit} AI messages per day. Daily limit resets in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}. Subscribe for unlimited AI chat access.`,
    };
  }
  
  return { allowed: true };
};
