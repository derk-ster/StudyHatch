'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import { useAuth } from '@/lib/auth-context';
import { createGameSocket } from '@/lib/games/ws-client';
import {
  clearLastHostCode,
  clearLastGameCode,
  getLastGameCode,
  getLastHostCode,
  getStoredHostKey,
  getStoredPlayerId,
  setLastGameCode,
  setLastHostCode,
  setStoredHostKey,
  setStoredPlayerId,
} from '@/lib/games/session-store';
import { backupDecks, getAllDecks, getClassesForSchool, getClassesForStudent, getSchoolForUser, getStudentsForClass, getDeckById, restoreDecksFromBackup } from '@/lib/storage';
import type { ClassRoom, Deck } from '@/types/vocab';
import type { DirectionSetting, GameMode } from '@/types/games';
import { WORD_HEIST_MODE } from '@/lib/games/engines/word-heist';
import { LIGHTNING_LADDER_MODE } from '@/lib/games/engines/lightning-ladder';
import { SURVIVAL_SPRINT_MODE } from '@/lib/games/engines/survival-sprint';

const MODE_CHOICES = [WORD_HEIST_MODE, LIGHTNING_LADDER_MODE, SURVIVAL_SPRINT_MODE];

export default function GamesPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [hostDeckId, setHostDeckId] = useState<string>('');
  const [hostMode, setHostMode] = useState<GameMode>('word-heist');
  const [direction, setDirection] = useState<DirectionSetting>('en-to-target');
  const [timePerQuestion, setTimePerQuestion] = useState<number>(20);
  const [maxPlayers, setMaxPlayers] = useState<string>('');
  const [gameDurationMinutes, setGameDurationMinutes] = useState<string>('');
  const [classroomOnly, setClassroomOnly] = useState(false);
  const [classroomId, setClassroomId] = useState('');
  const [hostError, setHostError] = useState('');
  const [isHosting, setIsHosting] = useState(false);
  const [resumeHostCode, setResumeHostCode] = useState<string | null>(null);
  const [resumeJoinCode, setResumeJoinCode] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const hostTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (restoreDecksFromBackup()) {
      // ensure state refresh after restore
    }
    const loaded = getAllDecks();
    setDecks(loaded);
    if (!hostDeckId && loaded.length > 0) {
      setHostDeckId(loaded[0].id);
    }
    backupDecks();
  }, [hostDeckId]);

  useEffect(() => {
    const scope = session?.userId || 'guest';
    const lastHost = getLastHostCode(scope);
    if (lastHost && getStoredHostKey(lastHost, scope)) {
      setResumeHostCode(lastHost);
    } else {
      setResumeHostCode(null);
    }
    const lastGame = getLastGameCode(scope);
    if (lastGame && getStoredPlayerId(lastGame, scope) && lastGame !== lastHost) {
      setResumeJoinCode(lastGame);
    } else {
      setResumeJoinCode(null);
    }
  }, [session?.userId, session?.isGuest]);

  useEffect(() => {
    if (!session?.userId || session.isGuest) {
      setClasses([]);
      return;
    }
    if (session.role === 'teacher') {
      const school = getSchoolForUser(session.userId);
      const schoolClasses = school ? getClassesForSchool(school.id) : [];
      setClasses(schoolClasses);
    } else if (session.role === 'student') {
      setClasses(getClassesForStudent(session.userId));
    } else {
      setClasses([]);
    }
  }, [session?.userId, session?.role, session?.isGuest]);

  const hasDecks = decks.length > 0;
  const deckOptions = useMemo(() => decks.map(deck => ({ value: deck.id, label: deck.name })), [decks]);

  const clearHostTimeout = () => {
    if (hostTimeoutRef.current) {
      clearTimeout(hostTimeoutRef.current);
      hostTimeoutRef.current = null;
    }
  };

  const clearJoinTimeout = () => {
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
  };

  const handleHostGame = () => {
    setHostError('');
    if (!session || session.isGuest || !session.userId) {
      setHostError('You must be logged in to host a game.');
      return;
    }
    if (!hostDeckId) {
      setHostError('Select a deck to host.');
      return;
    }
    if (classroomOnly && session.role !== 'teacher') {
      setHostError('Only teachers can host classroom-only games.');
      return;
    }
    if (classroomOnly && !classroomId) {
      setHostError('Select a classroom to host a private game.');
      return;
    }
    const deck = getDeckById(hostDeckId);
    if (!deck) {
      setHostError('Deck not found.');
      return;
    }

    const allowedUserIds =
      classroomOnly && classroomId ? getStudentsForClass(classroomId).map(student => student.userId) : [];
    const hostName = session.username || 'Host';
    setIsHosting(true);
    clearHostTimeout();

    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === 'error') {
          setHostError(message.payload.message);
          setIsHosting(false);
          clearHostTimeout();
          socket.close();
        }
        if (message.type === 'session_joined') {
          const scope = session?.userId || 'guest';
          setStoredPlayerId(message.payload.code, message.payload.playerId, scope);
          if (message.payload.hostKey) {
            setStoredHostKey(message.payload.code, message.payload.hostKey, scope);
            setLastHostCode(message.payload.code, scope);
          }
          setLastGameCode(message.payload.code, scope);
          setResumeHostCode(message.payload.code);
          setResumeJoinCode(null);
          setIsHosting(false);
          clearHostTimeout();
          socket.close();
          router.push(`/games/lobby/${message.payload.code}`);
        }
      },
      onOpen: () => {
        hostTimeoutRef.current = setTimeout(() => {
          setHostError('Unable to reach the game server. Please try again.');
          setIsHosting(false);
          socket.close();
        }, 5000);
        socket.send('create_session', {
          deck,
          mode: hostMode,
          settings: {
            direction,
            timePerQuestion,
            maxPlayers: maxPlayers ? Number(maxPlayers) : null,
            gameDurationMinutes: gameDurationMinutes ? Number(gameDurationMinutes) : null,
            classroomOnly,
            classroomId: classroomOnly ? classroomId : null,
            allowedUserIds,
          },
          host: {
            userId: session.userId,
            name: hostName,
          },
        });
      },
      onClose: () => {
        clearHostTimeout();
        setIsHosting(false);
      },
      onError: () => {
        setHostError('Unable to connect to the game server.');
        setIsHosting(false);
        clearHostTimeout();
      },
    });
  };

  const handleResumeHost = () => {
    if (!resumeHostCode) return;
    router.push(`/games/lobby/${resumeHostCode}`);
  };

  const handleResumeJoin = () => {
    if (!resumeJoinCode) return;
    router.push(`/games/lobby/${resumeJoinCode}`);
  };

  const handleCancelHost = () => {
    if (!resumeHostCode) return;
    setHostError('');
    const scope = session?.userId || 'guest';
    const hostKey = getStoredHostKey(resumeHostCode, scope);
    clearLastHostCode(scope);
    clearLastGameCode(scope);
    setResumeHostCode(null);
    setResumeJoinCode(null);
    if (!hostKey) {
      return;
    }
    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === 'error') {
          setHostError(message.payload.message);
          socket.close();
          return;
        }
        if (message.type === 'session_joined') {
          setStoredPlayerId(message.payload.code, message.payload.playerId, scope);
          socket.send('end_game', { code: resumeHostCode, playerId: message.payload.playerId });
          return;
        }
        if (message.type === 'session_state') {
          socket.close();
        }
      },
      onOpen: () => {
        socket.send('join_session', {
          code: resumeHostCode,
          name: session?.username || 'Host',
          userId: session?.isGuest ? null : session?.userId,
          hostKey,
        });
      },
      onError: () => {
      },
    });
  };

  const handleJoinGame = () => {
    setJoinError('');
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Enter a game code to join.');
      return;
    }
    const name = displayName.trim();
    if (!name) {
      setJoinError('Enter a display name.');
      return;
    }
    setIsJoining(true);
    clearJoinTimeout();
    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === 'error') {
          setJoinError(message.payload.message);
          setIsJoining(false);
          clearJoinTimeout();
          socket.close();
        }
        if (message.type === 'session_joined') {
          const scope = session?.userId || 'guest';
          setStoredPlayerId(message.payload.code, message.payload.playerId, scope);
          localStorage.setItem('studyhatch-game-display-name', name);
          setLastGameCode(message.payload.code, scope);
          setResumeJoinCode(message.payload.code);
          setIsJoining(false);
          clearJoinTimeout();
          socket.close();
          router.push(`/games/lobby/${message.payload.code}`);
        }
      },
      onOpen: () => {
        joinTimeoutRef.current = setTimeout(() => {
          setJoinError('Unable to reach the game server. Please try again.');
          setIsJoining(false);
          socket.close();
        }, 5000);
        socket.send('join_session', {
          code,
          name,
          userId: session?.isGuest ? null : session?.userId,
        });
      },
      onClose: () => {
        clearJoinTimeout();
        setIsJoining(false);
      },
      onError: () => {
        setJoinError('Unable to connect to the game server.');
        setIsJoining(false);
        clearJoinTimeout();
      },
    });
  };

  return (
    <GameShell
      title="Games"
      subtitle="Host or join a live multiplayer session with StudyHatch decks."
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-2xl font-semibold text-white">Host a Game</h2>
          <p className="text-white/70 text-sm">
            Teachers and students can host. Guests may join but cannot host.
          </p>
          {resumeHostCode && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Resume your active game: <span className="font-semibold">{resumeHostCode}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResumeHost}
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-400"
                >
                  Resume
                </button>
                <button
                  onClick={handleCancelHost}
                  className="px-3 py-1 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
                >
                  Cancel Game
                </button>
              </div>
            </div>
          )}
          {resumeJoinCode && (
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Resume your active game: <span className="font-semibold">{resumeJoinCode}</span>
              </div>
              <button
                onClick={handleResumeJoin}
                className="px-3 py-1 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20"
              >
                Return to Game
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-white/70 text-sm">Deck</label>
              <select
                value={hostDeckId}
                onChange={(e) => setHostDeckId(e.target.value)}
                disabled={!hasDecks}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
              >
                {!hasDecks && (
                  <option value="" className="bg-gray-900">
                    No decks available
                  </option>
                )}
                {deckOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/70 text-sm">Game Mode</label>
              <div className="mt-2 grid gap-2">
                {MODE_CHOICES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setHostMode(mode.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      hostMode === mode.id
                        ? 'bg-purple-600/40 border-purple-400/60 text-white'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-semibold">{mode.name}</div>
                    <div className="text-xs text-white/60">{mode.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-white/70 text-sm">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value as DirectionSetting)}
                  className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="en-to-target" className="bg-gray-900">
                    EN → Target
                  </option>
                  <option value="target-to-en" className="bg-gray-900">
                    Target → EN
                  </option>
                </select>
              </div>
              <div>
                <label className="text-white/70 text-sm">Time per Question</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                  className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-white/70 text-sm">Max Players (optional)</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  placeholder="Open"
                />
              </div>
            <div>
              <label className="text-white/70 text-sm">Game Duration (minutes)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={gameDurationMinutes}
                onChange={(e) => setGameDurationMinutes(e.target.value)}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                placeholder="No limit"
              />
            </div>
              <div>
                <label className="text-white/70 text-sm">Classroom Only</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={classroomOnly}
                    onChange={(e) => setClassroomOnly(e.target.checked)}
                    disabled={session?.role !== 'teacher'}
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                  />
                  <span className="text-white/60 text-sm">
                    {session?.role === 'teacher' ? 'Restrict to a class roster.' : 'Teachers only.'}
                  </span>
                </div>
              </div>
            </div>

            {classroomOnly && session?.role === 'teacher' && (
              <div>
                <label className="text-white/70 text-sm">Select Classroom</label>
                <select
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                >
                  <option value="" className="bg-gray-900">
                    Choose a classroom
                  </option>
                  {classes.map(classroom => (
                    <option key={classroom.id} value={classroom.id} className="bg-gray-900">
                      {classroom.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hostError && <p className="text-red-300 text-sm">{hostError}</p>}

            <button
              onClick={handleHostGame}
              disabled={isHosting || !hasDecks}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 disabled:opacity-60"
            >
              {!hasDecks ? 'Create a deck to host' : isHosting ? 'Creating Game...' : 'Host Game'}
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-2xl font-semibold text-white">Join a Game</h2>
          <p className="text-white/70 text-sm">Guests can join with a display name.</p>

          <div className="space-y-4">
            <div>
              <label className="text-white/70 text-sm">Game Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white tracking-widest uppercase"
                placeholder="ABC123"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                placeholder="Your name"
              />
            </div>
            {joinError && <p className="text-red-300 text-sm">{joinError}</p>}
            <button
              onClick={handleJoinGame}
              disabled={isJoining}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold disabled:opacity-60"
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
