'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';
import { ClassRoom, Deck, School } from '@/types/vocab';
import { createClassRoom, getAllDecks, getClassesForSchool, getSchoolForUser, getStudentsForClass, publishDeckToClass, getClassSettings, setClassSettings } from '@/lib/storage';
import { getActivityLogForClasses } from '@/lib/activity-log';
import { isSchoolModeEnabled } from '@/lib/school-mode';

const expirationOptions = [
  { value: '1d', label: '24 hours' },
  { value: '3d', label: '3 days' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: 'never', label: 'Never expires' },
];

const getExpirationTimestamp = (selection: string): number | null => {
  const now = Date.now();
  switch (selection) {
    case '1d':
      return now + 24 * 60 * 60 * 1000;
    case '3d':
      return now + 3 * 24 * 60 * 60 * 1000;
    case '1w':
      return now + 7 * 24 * 60 * 60 * 1000;
    case '1m':
      return now + 30 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [school, setSchool] = useState<School | undefined>();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [className, setClassName] = useState('');
  const [classDescription, setClassDescription] = useState('');
  const [publishSelections, setPublishSelections] = useState<Record<string, { classId: string; expiration: string }>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [classSettings, setClassSettingsState] = useState<Record<string, ReturnType<typeof getClassSettings>>>({});
  const [activityLogs, setActivityLogs] = useState(getActivityLogForClasses([]));
  const schoolMode = isSchoolModeEnabled();

  useEffect(() => {
    if (!session?.userId || session.role !== 'teacher') return;
    const userSchool = getSchoolForUser(session.userId);
    setSchool(userSchool);
    if (userSchool) {
      setClasses(getClassesForSchool(userSchool.id));
    }
    const allDecks = getAllDecks().filter(deck => deck.ownerUserId === session.userId);
    setDecks(allDecks);
  }, [session?.userId, session?.role]);

  useEffect(() => {
    if (classes.length === 0) {
      setClassSettingsState({});
      setActivityLogs(getActivityLogForClasses([]));
      return;
    }
    const updated: Record<string, ReturnType<typeof getClassSettings>> = {};
    classes.forEach((classroom) => {
      updated[classroom.id] = getClassSettings(classroom.id);
    });
    setClassSettingsState(updated);
    setActivityLogs(getActivityLogForClasses(classes.map(cls => cls.id)));
  }, [classes]);

  const handleUpdateClassSetting = (classId: string, key: 'aiTutorEnabled' | 'studentDecksEnabled' | 'multiplayerEnabled', value: boolean) => {
    const updated = setClassSettings(classId, { [key]: value }, session?.userId);
    setClassSettingsState(prev => ({ ...prev, [classId]: updated }));
  };

  const handleRefreshLogs = () => {
    setActivityLogs(getActivityLogForClasses(classes.map(cls => cls.id)));
  };

  const handleCreateClass = () => {
    if (!school) {
      setError('School not found.');
      return;
    }
    if (!className.trim()) {
      setError('Enter a class name.');
      return;
    }
    const created = createClassRoom(school.id, className, classDescription || undefined);
    setClasses(prev => [...prev, created]);
    setClassName('');
    setClassDescription('');
    setMessage('');
    setError('');
    router.push('/');
  };

  const handlePublishSelection = (deckId: string, updates: Partial<{ classId: string; expiration: string }>) => {
    setPublishSelections(prev => ({
      ...prev,
      [deckId]: {
        classId: prev[deckId]?.classId || classes[0]?.id || '',
        expiration: prev[deckId]?.expiration || 'never',
        ...updates,
      },
    }));
  };

  const handlePublish = (deckId: string) => {
    const selection = publishSelections[deckId];
    if (!selection?.classId) {
      setError('Select a class before publishing.');
      return;
    }
    const expiresAt = getExpirationTimestamp(selection.expiration);
    publishDeckToClass(deckId, selection.classId, expiresAt);
    setMessage('Deck published to class.');
    setError('');
  };

  if (!session || session.isGuest) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/70">Please log in as a teacher to view the dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  if (session.role !== 'teacher') {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/70">Teacher dashboard is only available for teacher accounts.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Teacher Dashboard
          </h1>
          <p className="text-white/70 mb-8">Manage your classrooms and published decks.</p>

          {(message || error) && (
            <div className={`mb-6 p-4 rounded-lg ${error ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
              <p className={error ? 'text-red-400 font-medium' : 'text-green-300 font-medium'}>
                {error || message}
              </p>
            </div>
          )}

          {school && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
              <h2 className="text-2xl font-semibold mb-2">My School</h2>
              <p className="text-white/80">{school.name}</p>
              {school.description && <p className="text-white/60 text-sm">{school.description}</p>}
              <div className="mt-3 text-white/60 text-sm">
                Teacher invite link:{' '}
                <span className="text-purple-300">studyhatch.app/join-school/{school.inviteCode}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-3">Create Classroom</h2>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                placeholder="Class name"
              />
              <input
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
                placeholder="Description (optional)"
              />
              <button
                onClick={handleCreateClass}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
              >
                Create Class
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-3">Publish Decks</h2>
              <p className="text-white/60 text-sm mb-3">Choose a deck and class to publish.</p>
              {decks.length === 0 ? (
                <p className="text-white/50 text-sm">Create a deck first to publish.</p>
              ) : (
                <div className="space-y-3">
                  {decks.map(deck => (
                    <div key={deck.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-white/80 font-medium mb-2">{deck.name}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select
                          value={publishSelections[deck.id]?.classId || classes[0]?.id || ''}
                          onChange={(e) => handlePublishSelection(deck.id, { classId: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {classes.map(classroom => (
                            <option key={classroom.id} value={classroom.id} className="bg-gray-800">
                              {classroom.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={publishSelections[deck.id]?.expiration || 'never'}
                          onChange={(e) => handlePublishSelection(deck.id, { expiration: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {expirationOptions.map(option => (
                            <option key={option.value} value={option.value} className="bg-gray-800">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handlePublish(deck.id)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all"
                        >
                          Publish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {schoolMode && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-10">
              <h2 className="text-xl font-semibold mb-4">School Edition Controls</h2>
              <p className="text-white/60 text-sm mb-6">
                Toggle AI tutor, student deck creation, and multiplayer availability for each class.
              </p>
              {classes.length === 0 ? (
                <p className="text-white/50 text-sm">Create a class to configure school settings.</p>
              ) : (
                <div className="space-y-4">
                  {classes.map(classroom => {
                    const settings = classSettings[classroom.id] || getClassSettings(classroom.id);
                    return (
                      <div key={classroom.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white/80 font-medium">{classroom.name}</p>
                            <p className="text-white/50 text-xs">Join code: {classroom.joinCode}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-white/80">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.aiTutorEnabled}
                              onChange={(e) => handleUpdateClassSetting(classroom.id, 'aiTutorEnabled', e.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-white/10"
                            />
                            Enable AI tutor
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.studentDecksEnabled}
                              onChange={(e) => handleUpdateClassSetting(classroom.id, 'studentDecksEnabled', e.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-white/10"
                            />
                            Allow student deck creation
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.multiplayerEnabled}
                              onChange={(e) => handleUpdateClassSetting(classroom.id, 'multiplayerEnabled', e.target.checked)}
                              className="h-4 w-4 rounded border-white/20 bg-white/10"
                            />
                            Enable multiplayer games
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Classrooms & Students</h2>
            {classes.length === 0 ? (
              <p className="text-white/60">No classes created yet.</p>
            ) : (
              <div className="space-y-4">
                {classes.map(classroom => (
                  <div key={classroom.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white/80 font-medium">{classroom.name}</p>
                        <p className="text-white/50 text-xs">Join code: {classroom.joinCode}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm mb-2">Students</p>
                      {getStudentsForClass(classroom.id).length === 0 ? (
                        <p className="text-white/40 text-sm">No students yet.</p>
                      ) : (
                        <ul className="text-white/70 text-sm space-y-1">
                          {getStudentsForClass(classroom.id).map(student => (
                            <li key={student.userId}>@{student.username}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {schoolMode && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Student Activity Logs</h2>
                <button
                  onClick={handleRefreshLogs}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  Refresh
                </button>
              </div>
              {activityLogs.length === 0 ? (
                <p className="text-white/60 text-sm">No activity logged yet.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityLogs.slice(0, 50).map(log => (
                    <div key={log.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 font-medium">@{log.username}</span>
                        <span className="text-white/50 text-xs">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-white/70 mt-1">{log.action}</p>
                      {log.details && <p className="text-white/50 text-xs mt-1">{log.details}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
