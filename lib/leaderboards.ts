export type WeeklyUserStats = {
  username: string;
  activities: number;
  accuracyCorrect: number;
  accuracyTotal: number;
};

export type WeeklyLeaderboardStats = {
  weekStart: number;
  users: Record<string, WeeklyUserStats>;
  classUsers: Record<string, Record<string, WeeklyUserStats>>;
};

const WEEKLY_LEADERBOARD_KEY = 'studyhatch-weekly-leaderboards';
const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const getWeekStartTimestamp = (reference = new Date()): number => {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - dayOfWeek);
  return date.getTime();
};

export const getWeekRangeLabel = (): { start: string; end: string } => {
  const start = new Date(getWeekStartTimestamp());
  const end = new Date(start.getTime() + WEEK_DURATION_MS - 1);
  return {
    start: start.toLocaleDateString(),
    end: end.toLocaleDateString(),
  };
};

const getEmptyStats = (): WeeklyLeaderboardStats => ({
  weekStart: getWeekStartTimestamp(),
  users: {},
  classUsers: {},
});

const readWeeklyStats = (): WeeklyLeaderboardStats => {
  if (typeof window === 'undefined') {
    return getEmptyStats();
  }
  try {
    const stored = localStorage.getItem(WEEKLY_LEADERBOARD_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WeeklyLeaderboardStats;
      if (parsed.weekStart === getWeekStartTimestamp()) {
        return parsed;
      }
    }
  } catch (error) {
    // ignore malformed storage
  }
  return getEmptyStats();
};

const saveWeeklyStats = (stats: WeeklyLeaderboardStats): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WEEKLY_LEADERBOARD_KEY, JSON.stringify(stats));
  } catch (error) {
    // ignore storage errors
  }
};

const ensureUserStats = (stats: WeeklyLeaderboardStats, userId: string, username: string): WeeklyUserStats => {
  if (!stats.users[userId]) {
    stats.users[userId] = { username, activities: 0, accuracyCorrect: 0, accuracyTotal: 0 };
  } else if (username && stats.users[userId].username !== username) {
    stats.users[userId].username = username;
  }
  return stats.users[userId];
};

const ensureClassUserStats = (
  stats: WeeklyLeaderboardStats,
  classId: string,
  userId: string,
  username: string
): WeeklyUserStats => {
  if (!stats.classUsers[classId]) {
    stats.classUsers[classId] = {};
  }
  if (!stats.classUsers[classId][userId]) {
    stats.classUsers[classId][userId] = { username, activities: 0, accuracyCorrect: 0, accuracyTotal: 0 };
  } else if (username && stats.classUsers[classId][userId].username !== username) {
    stats.classUsers[classId][userId].username = username;
  }
  return stats.classUsers[classId][userId];
};

export const recordWeeklyStudyAttempt = (
  userId: string,
  username: string,
  correct: boolean,
  classIds: string[] = []
): void => {
  if (typeof window === 'undefined') return;
  const stats = readWeeklyStats();
  const userStats = ensureUserStats(stats, userId, username);
  userStats.activities += 1;
  userStats.accuracyTotal += 1;
  if (correct) {
    userStats.accuracyCorrect += 1;
  }
  classIds.forEach((classId) => {
    const classStats = ensureClassUserStats(stats, classId, userId, username);
    classStats.activities += 1;
    classStats.accuracyTotal += 1;
    if (correct) {
      classStats.accuracyCorrect += 1;
    }
  });
  saveWeeklyStats(stats);
};

export const recordWeeklyActivity = (
  userId: string,
  username: string,
  classIds: string[] = [],
  amount = 1
): void => {
  if (typeof window === 'undefined') return;
  const stats = readWeeklyStats();
  const userStats = ensureUserStats(stats, userId, username);
  userStats.activities += amount;
  classIds.forEach((classId) => {
    const classStats = ensureClassUserStats(stats, classId, userId, username);
    classStats.activities += amount;
  });
  saveWeeklyStats(stats);
};

export const getWeeklyStatsSnapshot = (): WeeklyLeaderboardStats => {
  return readWeeklyStats();
};
