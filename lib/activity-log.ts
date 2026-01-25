import { getUserById } from '@/lib/auth';
import { getClassesForStudent } from '@/lib/storage';

export type ActivityLogEntry = {
  id: string;
  userId: string;
  username: string;
  role: string;
  action: string;
  classId?: string;
  details?: string;
  createdAt: number;
};

const ACTIVITY_LOG_KEY = 'studyhatch-activity-log';

const readLogs = (): ActivityLogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
    return stored ? (JSON.parse(stored) as ActivityLogEntry[]) : [];
  } catch (error) {
    return [];
  }
};

const writeLogs = (entries: ActivityLogEntry[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(entries.slice(-500)));
  } catch (error) {
    // ignore storage errors
  }
};

export const recordActivity = (userId: string, action: string, details?: string, classId?: string): void => {
  if (typeof window === 'undefined') return;
  const user = getUserById(userId);
  const entry: ActivityLogEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    username: user?.username || 'Unknown',
    role: user?.role || 'student',
    action,
    classId,
    details,
    createdAt: Date.now(),
  };
  const logs = readLogs();
  logs.push(entry);
  writeLogs(logs);
};

export const getActivityLogForClasses = (classIds: string[]): ActivityLogEntry[] => {
  const logs = readLogs();
  if (classIds.length === 0) return logs.slice().reverse();
  return logs.filter(log => log.classId && classIds.includes(log.classId)).slice().reverse();
};

export const getActivityLogForStudent = (userId: string): ActivityLogEntry[] => {
  const logs = readLogs();
  return logs.filter(log => log.userId === userId).slice().reverse();
};

export const recordStudentActivityForClasses = (userId: string, action: string, details?: string): void => {
  const classes = getClassesForStudent(userId);
  if (classes.length === 0) {
    recordActivity(userId, action, details);
    return;
  }
  classes.forEach((classroom) => recordActivity(userId, action, details, classroom.id));
};
