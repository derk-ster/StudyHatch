import { UserProgress, StudyMode, ActivityType, Deck, VocabCard, Classroom, PublishedDeck, School, ClassRoom, ClassMembership } from '@/types/vocab';
import { addUserClassroom, getCurrentSession, getUserById, removeClassroomFromAllUsers, setUserSchool } from './auth';

const STORAGE_KEY = 'spanish-vocab-progress';
const DECKS_STORAGE_KEY = 'spanish-vocab-decks';
const DECKS_BACKUP_STORAGE_KEY = 'spanish-vocab-decks-backup';
const CLASSROOMS_STORAGE_KEY = 'studyhatch-classrooms';
const PUBLISHED_DECKS_STORAGE_KEY = 'studyhatch-published-decks';
const SCHOOLS_STORAGE_KEY = 'studyhatch-schools';
const CLASSES_STORAGE_KEY = 'studyhatch-classes';
const CLASS_MEMBERSHIPS_STORAGE_KEY = 'studyhatch-class-memberships';
const CLASS_DECKS_STORAGE_KEY = 'studyhatch-class-decks';

const getDeckStorageKey = (): string => {
  if (typeof window === 'undefined') return DECKS_STORAGE_KEY;
  const session = getCurrentSession();
  if (session?.userId && !session.isGuest) {
    return `${DECKS_STORAGE_KEY}-${session.userId}`;
  }
  return DECKS_STORAGE_KEY;
};

const getDeckBackupStorageKey = (): string => {
  if (typeof window === 'undefined') return DECKS_BACKUP_STORAGE_KEY;
  const session = getCurrentSession();
  if (session?.userId && !session.isGuest) {
    return `${DECKS_BACKUP_STORAGE_KEY}-${session.userId}`;
  }
  return DECKS_BACKUP_STORAGE_KEY;
};

export const backupDecks = (): void => {
  if (typeof window === 'undefined') return;
  const decks = getAllDecks();
  if (decks.length === 0) return;
  try {
    localStorage.setItem(getDeckBackupStorageKey(), JSON.stringify(decks));
  } catch (error) {
    console.error('Error backing up decks:', error);
  }
};

export const restoreDecksFromBackup = (): boolean => {
  if (typeof window === 'undefined') return false;
  const existing = getAllDecks();
  if (existing.length > 0) return false;
  try {
    const stored = localStorage.getItem(getDeckBackupStorageKey());
    if (!stored) return false;
    localStorage.setItem(getDeckStorageKey(), stored);
    return true;
  } catch (error) {
    console.error('Error restoring decks:', error);
    return false;
  }
};

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
    const stored = localStorage.getItem(getDeckStorageKey());
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading decks:', error);
  }
  
  return [];
};

export const reorderDecksByIds = (orderedIds: string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const decks = getAllDecks();
    const deckMap = new Map(decks.map(deck => [deck.id, deck]));
    const reordered: Deck[] = [];
    orderedIds.forEach(id => {
      const deck = deckMap.get(id);
      if (deck) {
        reordered.push(deck);
        deckMap.delete(id);
      }
    });
    deckMap.forEach(deck => reordered.push(deck));
    localStorage.setItem(getDeckStorageKey(), JSON.stringify(reordered));
  } catch (error) {
    console.error('Error reordering decks:', error);
  }
};

export const saveDeck = (deck: Deck): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const session = getCurrentSession();
    const decks = getAllDecks();
    const existingIndex = decks.findIndex(d => d.id === deck.id);
    const existingDeck = existingIndex >= 0 ? decks[existingIndex] : undefined;
    
    // Ensure targetLanguage exists (backward compatibility)
    const deckToSave = {
      ...deck,
      targetLanguage: deck.targetLanguage || 'es', // Default to Spanish for old decks
      visibility: deck.visibility || 'private',
      ownerUserId: deck.ownerUserId ?? existingDeck?.ownerUserId ?? (session?.isGuest ? undefined : session?.userId),
      schoolId: deck.schoolId ?? existingDeck?.schoolId,
    };
    
    if (existingIndex >= 0) {
      decks[existingIndex] = deckToSave;
    } else {
      decks.push(deckToSave);
    }
    
    localStorage.setItem(getDeckStorageKey(), JSON.stringify(decks));
  } catch (error) {
    console.error('Error saving deck:', error);
  }
};

export const setDeckVisibility = (deckId: string, visibility: 'private' | 'public'): boolean => {
  const deck = getDeckById(deckId);
  if (!deck) return false;
  saveDeck({ ...deck, visibility });
  return true;
};

export const getPublicDecks = (): Deck[] => {
  return getAllDecks().filter(deck => deck.visibility === 'public');
};

export const duplicateDeck = (deckId: string, ownerUserId?: string): Deck | null => {
  const deck = getDeckById(deckId);
  if (!deck) return null;
  const copiedDeck: Deck = {
    ...deck,
    id: `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${deck.name} (Copy)`,
    createdDate: Date.now(),
    visibility: 'private',
    ownerUserId,
    schoolId: undefined,
  };
  saveDeck(copiedDeck);
  return copiedDeck;
};

// School + Class Storage Functions
export const getAllSchools = (): School[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SCHOOLS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading schools:', error);
    return [];
  }
};

const saveAllSchools = (schools: School[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(schools));
  } catch (error) {
    console.error('Error saving schools:', error);
  }
};

const generateInviteCode = (existingCodes: Set<string>, length = 6): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  if (existingCodes.has(code)) {
    return generateInviteCode(existingCodes, length);
  }
  return code;
};

export const createSchool = (name: string, description: string | undefined, createdBy: string): School => {
  const schools = getAllSchools();
  const inviteCode = generateInviteCode(new Set(schools.map(s => s.inviteCode.toUpperCase())), 6);
  const school: School = {
    id: `school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    description: description?.trim() || undefined,
    createdBy,
    inviteCode,
    createdAt: Date.now(),
    teacherIds: [createdBy],
  };
  saveAllSchools([...schools, school]);
  setUserSchool(createdBy, school.id);
  return school;
};

export const getSchoolByInviteCode = (code: string): School | undefined => {
  const normalized = code.trim().toUpperCase();
  return getAllSchools().find(school => school.inviteCode.toUpperCase() === normalized);
};

export const joinSchoolByInviteCode = (teacherId: string, code: string): { success: boolean; error?: string; school?: School } => {
  const school = getSchoolByInviteCode(code);
  if (!school) {
    return { success: false, error: 'School invite code not found.' };
  }
  const schools = getAllSchools();
  const updated = schools.map(s => {
    if (s.id !== school.id) return s;
    const teacherIds = s.teacherIds.includes(teacherId) ? s.teacherIds : [...s.teacherIds, teacherId];
    return { ...s, teacherIds };
  });
  saveAllSchools(updated);
  setUserSchool(teacherId, school.id);
  return { success: true, school };
};

export const getSchoolById = (schoolId: string): School | undefined => {
  return getAllSchools().find(school => school.id === schoolId);
};

export const getSchoolForUser = (userId: string): School | undefined => {
  const user = getUserById(userId);
  if (!user?.schoolId) return undefined;
  return getSchoolById(user.schoolId);
};

export const getClasses = (): ClassRoom[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CLASSES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading classes:', error);
    return [];
  }
};

const saveClasses = (classes: ClassRoom[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
  } catch (error) {
    console.error('Error saving classes:', error);
  }
};

export const createClassRoom = (schoolId: string, name: string, description?: string): ClassRoom => {
  const classes = getClasses();
  const joinCode = generateInviteCode(new Set(classes.map(c => c.joinCode.toUpperCase())), 6);
  const classroom: ClassRoom = {
    id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    schoolId,
    name: name.trim(),
    description: description?.trim() || undefined,
    joinCode,
    createdAt: Date.now(),
  };
  saveClasses([...classes, classroom]);
  return classroom;
};

export const getClassesForSchool = (schoolId: string): ClassRoom[] => {
  return getClasses().filter(c => c.schoolId === schoolId);
};

export const getClassByJoinCode = (code: string): ClassRoom | undefined => {
  const normalized = code.trim().toUpperCase();
  return getClasses().find(c => c.joinCode.toUpperCase() === normalized);
};

export const getClassMemberships = (): ClassMembership[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CLASS_MEMBERSHIPS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading class memberships:', error);
    return [];
  }
};

const saveClassMemberships = (memberships: ClassMembership[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLASS_MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships));
  } catch (error) {
    console.error('Error saving class memberships:', error);
  }
};

export const addStudentToClass = (userId: string, classId: string): void => {
  const memberships = getClassMemberships();
  const exists = memberships.some(m => m.userId === userId && m.classId === classId);
  if (exists) return;
  saveClassMemberships([...memberships, { userId, classId, joinedAt: Date.now() }]);
};

export const joinClassByCode = (userId: string, code: string): { success: boolean; error?: string; classroom?: ClassRoom } => {
  const classroom = getClassByJoinCode(code);
  if (!classroom) {
    return { success: false, error: 'Class code not found.' };
  }
  addStudentToClass(userId, classroom.id);
  return { success: true, classroom };
};

export const getClassesForStudent = (userId: string): ClassRoom[] => {
  const memberships = getClassMemberships().filter(m => m.userId === userId);
  const classes = getClasses();
  return classes.filter(c => memberships.some(m => m.classId === c.id));
};

export const getStudentsForClass = (classId: string): { userId: string; username: string }[] => {
  const memberships = getClassMemberships().filter(m => m.classId === classId);
  return memberships
    .map(m => {
      const user = getUserById(m.userId);
      return user ? { userId: user.id, username: user.username } : null;
    })
    .filter(Boolean) as { userId: string; username: string }[];
};

export type ClassPublishedDeck = {
  deckId: string;
  classId: string;
  expiresAt?: number | null;
  publishedAt: number;
};

export const getClassPublishedDecks = (): ClassPublishedDeck[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CLASS_DECKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading class decks:', error);
    return [];
  }
};

const saveClassPublishedDecks = (entries: ClassPublishedDeck[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLASS_DECKS_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving class decks:', error);
  }
};

const pruneExpiredClassDecks = (): ClassPublishedDeck[] => {
  const now = Date.now();
  const entries = getClassPublishedDecks();
  return entries.filter(entry => !entry.expiresAt || entry.expiresAt > now);
};

export const publishDeckToClass = (deckId: string, classId: string, expiresAt?: number | null): void => {
  const entries = pruneExpiredClassDecks().filter(entry => !(entry.deckId === deckId && entry.classId === classId));
  entries.push({ deckId, classId, expiresAt: expiresAt ?? null, publishedAt: Date.now() });
  saveClassPublishedDecks(entries);
};

export const getActiveClassDecks = (classId: string): ClassPublishedDeck[] => {
  return pruneExpiredClassDecks().filter(entry => entry.classId === classId);
};

export const getClassDeckIdsForStudent = (userId: string): string[] => {
  const classes = getClassesForStudent(userId);
  const entries = pruneExpiredClassDecks();
  return entries.filter(entry => classes.some(c => c.id === entry.classId)).map(entry => entry.deckId);
};

export const deleteDeck = (deckId: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const decks = getAllDecks();
    const filtered = decks.filter(d => d.id !== deckId);
    localStorage.setItem(getDeckStorageKey(), JSON.stringify(filtered));
    
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

// Classroom Storage Functions
export const getAllClassrooms = (): Classroom[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading classrooms:', error);
  }
  
  return [];
};

const saveAllClassrooms = (classrooms: Classroom[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(classrooms));
  } catch (error) {
    console.error('Error saving classrooms:', error);
  }
};

const generateClassCode = (existingCodes: Set<string>): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  if (existingCodes.has(code)) {
    return generateClassCode(existingCodes);
  }
  return code;
};

export const createClassroom = (ownerUserId: string, name?: string): Classroom => {
  const classrooms = getAllClassrooms();
  const existingCodes = new Set(classrooms.map(c => c.classCode.toUpperCase()));
  const classroom: Classroom = {
    id: `classroom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerUserId,
    name: name?.trim() || undefined,
    classCode: generateClassCode(existingCodes),
    createdAt: Date.now(),
  };
  saveAllClassrooms([...classrooms, classroom]);
  addUserClassroom(ownerUserId, classroom.id);
  return classroom;
};

export const getClassroomsForUser = (userId: string): Classroom[] => {
  const user = getUserById(userId);
  if (!user?.classroomIds || user.classroomIds.length === 0) {
    return [];
  }
  const classrooms = getAllClassrooms();
  return classrooms.filter(c => user.classroomIds?.includes(c.id));
};

export const getOwnedClassrooms = (userId: string): Classroom[] => {
  const classrooms = getAllClassrooms();
  return classrooms.filter(c => c.ownerUserId === userId);
};

export const joinClassroomByCode = (userId: string, codeInput: string): { success: boolean; error?: string; classroom?: Classroom } => {
  const code = codeInput.trim().toUpperCase();
  if (!code) {
    return { success: false, error: 'Please enter a class code.' };
  }
  const classrooms = getAllClassrooms();
  const classroom = classrooms.find(c => c.classCode.toUpperCase() === code);
  if (!classroom) {
    return { success: false, error: 'Classroom not found. Check the code and try again.' };
  }
  addUserClassroom(userId, classroom.id);
  return { success: true, classroom };
};

export const deleteClassroom = (classroomId: string, requestingUserId?: string): boolean => {
  const classrooms = getAllClassrooms();
  const classroom = classrooms.find(c => c.id === classroomId);
  if (!classroom) return false;
  if (requestingUserId && classroom.ownerUserId !== requestingUserId) {
    return false;
  }
  const updated = classrooms.filter(c => c.id !== classroomId);
  saveAllClassrooms(updated);
  removeClassroomFromAllUsers(classroomId);
  return true;
};

export const getPublishedDecks = (): PublishedDeck[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(PUBLISHED_DECKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading published decks:', error);
  }
  
  return [];
};

export const savePublishedDecks = (published: PublishedDeck[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(PUBLISHED_DECKS_STORAGE_KEY, JSON.stringify(published));
  } catch (error) {
    console.error('Error saving published decks:', error);
  }
};

const pruneExpiredPublishedDecks = (): PublishedDeck[] => {
  const now = Date.now();
  const published = getPublishedDecks();
  const active = published.filter(entry => !entry.expiresAt || entry.expiresAt > now);
  if (active.length !== published.length) {
    savePublishedDecks(active);
  }
  return active;
};

export const publishDeckToClassroom = (deckId: string, classroomId: string, expiresAt?: number | null): PublishedDeck => {
  const published = pruneExpiredPublishedDecks();
  const updated = published.filter(entry => !(entry.deckId === deckId && entry.classroomId === classroomId));
  const entry: PublishedDeck = {
    deckId,
    classroomId,
    expiresAt: expiresAt ?? null,
    publishedAt: Date.now(),
  };
  updated.push(entry);
  savePublishedDecks(updated);
  return entry;
};

export const unpublishDeckFromClassroom = (deckId: string, classroomId: string): void => {
  const published = pruneExpiredPublishedDecks();
  const updated = published.filter(entry => !(entry.deckId === deckId && entry.classroomId === classroomId));
  savePublishedDecks(updated);
};

export const getActivePublishedDecksForClassroom = (classroomId: string): PublishedDeck[] => {
  const published = pruneExpiredPublishedDecks();
  return published.filter(entry => entry.classroomId === classroomId);
};

export const getPublishedDecksForDeck = (deckId: string): PublishedDeck[] => {
  const published = pruneExpiredPublishedDecks();
  return published.filter(entry => entry.deckId === deckId);
};

export const getDeckById = (deckId: string): Deck | undefined => {
  const decks = getAllDecks();
  const deck = decks.find(d => d.id === deckId);
  
  // Backward compatibility: ensure targetLanguage exists
  if (deck && !deck.targetLanguage) {
    deck.targetLanguage = 'es'; // Default to Spanish for old decks
    // Also migrate old cards from spanish to translation field
    deck.cards = deck.cards.map(card => {
      const cardAny = card as any;
      if ('spanish' in cardAny && !('translation' in cardAny)) {
        return {
          ...(cardAny as object),
          translation: cardAny.spanish,
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
    const session = getCurrentSession();
    if (session?.role === 'teacher') return true;
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
const getDailyUsageKey = (): string => {
  if (typeof window === 'undefined') return DAILY_USAGE_KEY;
  const session = getCurrentSession();
  if (session?.userId && !session.isGuest) {
    return `${DAILY_USAGE_KEY}-${session.userId}`;
  }
  return DAILY_USAGE_KEY;
};
const DAILY_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export type DailyUsage = {
  lastReset: number; // timestamp
  translationsToday: number; // number of words translated today
  decksCreatedToday: number; // number of decks created today
  aiMessagesToday: number; // number of AI chat messages sent today
  publicSearchesToday?: number; // number of public deck searches
  editedDeckIdToday?: string | null; // deck edited today (students/guests)
  deckSavesToday?: number; // number of deck saves today (students/guests)
};

export const getDailyUsage = (): DailyUsage => {
  if (typeof window === 'undefined') {
    return {
      lastReset: Date.now(),
      translationsToday: 0,
      decksCreatedToday: 0,
      aiMessagesToday: 0,
      publicSearchesToday: 0,
      editedDeckIdToday: null,
      deckSavesToday: 0,
    };
  }
  
  try {
    const stored = localStorage.getItem(getDailyUsageKey());
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
          publicSearchesToday: 0,
          editedDeckIdToday: null,
          deckSavesToday: 0,
        };
        localStorage.setItem(getDailyUsageKey(), JSON.stringify(resetUsage));
        return resetUsage;
      }
      
      // Ensure aiMessagesToday exists for backward compatibility
      if (usage.aiMessagesToday === undefined) {
        usage.aiMessagesToday = 0;
      }

      if (usage.publicSearchesToday === undefined) {
        usage.publicSearchesToday = 0;
      }

      if (usage.editedDeckIdToday === undefined) {
        usage.editedDeckIdToday = null;
      }

      if (usage.deckSavesToday === undefined) {
        usage.deckSavesToday = 0;
      }
      
      return usage;
    }
  } catch (error) {
    console.error('Error loading daily usage:', error);
  }
  
  return {
    lastReset: Date.now(),
    translationsToday: 0,
    decksCreatedToday: 0,
    aiMessagesToday: 0,
    publicSearchesToday: 0,
    editedDeckIdToday: null,
    deckSavesToday: 0,
  };
};

export const saveDailyUsage = (usage: DailyUsage): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(getDailyUsageKey(), JSON.stringify(usage));
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

export const incrementDailyPublicSearches = (): void => {
  const usage = getDailyUsage();
  usage.publicSearchesToday = (usage.publicSearchesToday || 0) + 1;
  saveDailyUsage(usage);
};

export const canEditDeckToday = (deckId: string): { allowed: boolean; reason?: string } => {
  const usage = getDailyUsage();
  if (!usage.editedDeckIdToday || usage.editedDeckIdToday === deckId) {
    return { allowed: true };
  }
  const timeUntilReset = getTimeUntilReset();
  const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
  return {
    allowed: false,
    reason: `Students and guests can only edit 1 deck per day. Try again in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}.`,
  };
};

export const markDeckEditedToday = (deckId: string): void => {
  const usage = getDailyUsage();
  if (!usage.editedDeckIdToday) {
    usage.editedDeckIdToday = deckId;
    saveDailyUsage(usage);
  }
};

export const canSaveDeckToday = (): { allowed: boolean; reason?: string } => {
  const usage = getDailyUsage();
  const savesToday = usage.deckSavesToday || 0;
  if (savesToday >= 1) {
    const timeUntilReset = getTimeUntilReset();
    const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Students and guests can only save deck edits once per day. Try again in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}.`,
    };
  }
  return { allowed: true };
};

export const recordDeckSave = (): void => {
  const usage = getDailyUsage();
  usage.deckSavesToday = (usage.deckSavesToday || 0) + 1;
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
    maxDecks: premium ? Infinity : 10, // Free users: 10 decks
    maxCards: premium ? Infinity : 100,
    dailyTranslationLimit: premium ? Infinity : 50, // Free users: 50 words per day
    dailyDeckLimit: premium ? Infinity : 1, // Free users: 1 deck per day
    dailyAILimit: hasAISubscription() ? Infinity : 5, // Free users: 5 AI messages per day
    dailySearchLimit: premium ? Infinity : 3,
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
