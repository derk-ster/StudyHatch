'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import Leaderboard from '@/components/games/Leaderboard';
import type { GameSession } from '@/types/games';
import { createGameSocket } from '@/lib/games/ws-client';
import { useAuth } from '@/lib/auth-context';
import { updateLeaderboardsForUser } from '@/lib/leaderboard-client';
import {
  clearLastGameCode,
  clearLastHostCode,
  clearStoredGame,
  getStoredHostKey,
  getStoredPlayerId,
  setStoredHostKey,
  setStoredPlayerId,
} from '@/lib/games/session-store';

const buildCsv = (session: GameSession) => {
  const sorted = [...session.players].sort((a, b) => {
    if (session.mode === 'word-heist') {
      return b.bankedKeys - a.bankedKeys || b.unbankedKeys - a.unbankedKeys;
    }
    if (session.mode === 'lightning-ladder') {
      return b.ladderPosition - a.ladderPosition;
    }
    return b.hearts - a.hearts || b.score - a.score;
  });
  const headers = [
    'rank',
    'name',
    'bankedKeys',
    'unbankedKeys',
    'ladderPosition',
    'hearts',
    'score',
    'correct',
    'incorrect',
  ];
  const rows = sorted.map((player, index) => [
    index + 1,
    `"${player.name.replace(/"/g, '""')}"`,
    player.bankedKeys,
    player.unbankedKeys,
    player.ladderPosition,
    player.hearts,
    player.score,
    player.stats.correct,
    player.stats.incorrect,
  ]);
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

export default function GameResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const code = String(params.code || '').toUpperCase();
  const storageScope = authSession?.userId || 'guest';
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hasUpdatedLeaderboard, setHasUpdatedLeaderboard] = useState(false);
  const socketRef = useRef<ReturnType<typeof createGameSocket> | null>(null);

  useEffect(() => {
    if (!code) return;
    const name =
      localStorage.getItem('studyhatch-game-display-name') ||
      authSession?.username ||
      'Player';
    const hostKey = getStoredHostKey(code, storageScope);
    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === 'error') {
          setError(message.payload.message);
          return;
        }
        if (message.type === 'session_joined') {
          setStoredPlayerId(message.payload.code, message.payload.playerId, storageScope);
          setPlayerId(message.payload.playerId);
          if (message.payload.hostKey) {
            setStoredHostKey(message.payload.code, message.payload.hostKey, storageScope);
          }
          setSession(message.payload.session);
          return;
        }
        if (message.type === 'session_state') {
          setSession(message.payload);
        }
      },
      onOpen: () => {
        socket.send('join_session', {
          code,
          name,
          userId: authSession?.isGuest ? null : authSession?.userId,
          hostKey,
          allowEnded: true,
        });
      },
    });
    socketRef.current = socket;
    return () => socket.close();
  }, [code, authSession?.userId, authSession?.username, authSession?.isGuest, storageScope]);

  useEffect(() => {
    setPlayerId(getStoredPlayerId(code, storageScope));
  }, [code, storageScope]);

  useEffect(() => {
    if (!session || !player || hasUpdatedLeaderboard) return;
    if (!authSession || authSession.isGuest) return;
    if (!session.settings.classroomId) return;
    if (session.status !== 'ended') return;

    const didWin = playerRank === 1;
    updateLeaderboardsForUser(
      {
        points: Math.max(0, player.score || 0),
        gameWin: didWin,
      },
      session.settings.classroomId || undefined
    );
    setHasUpdatedLeaderboard(true);
  }, [session, player, authSession, hasUpdatedLeaderboard, playerRank]);

  const player = useMemo(
    () => session?.players.find(p => p.id === playerId) || null,
    [session, playerId]
  );

  const playerRank = useMemo(() => {
    if (!session || !player) return null;
    const sorted = [...session.players].sort((a, b) => {
      if (session.mode === 'word-heist') {
        return b.bankedKeys - a.bankedKeys || b.unbankedKeys - a.unbankedKeys;
      }
      if (session.mode === 'lightning-ladder') {
        return b.ladderPosition - a.ladderPosition;
      }
      return b.hearts - a.hearts || b.score - a.score;
    });
    const index = sorted.findIndex(p => p.id === player.id);
    return index >= 0 ? index + 1 : null;
  }, [session, player]);

  const totalClaps = useMemo(() => {
    if (!session) return 0;
    return session.players.reduce((sum, p) => sum + (p.claps || 0), 0);
  }, [session]);

  const timeRemaining = useMemo(() => {
    if (!session?.settings?.gameDurationMinutes || !session.startedAt) return null;
    const endAt = session.startedAt + session.settings.gameDurationMinutes * 60 * 1000;
    const remainingMs = Math.max(0, endAt - (session.endedAt || Date.now()));
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [session]);

  const handleClap = () => {
    if (!playerId) return;
    socketRef.current?.send('clap', { code, playerId });
  };

  const handleExport = () => {
    if (!session) return;
    const csv = buildCsv(session);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `studyhatch-game-${session.code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExit = () => {
    clearStoredGame(code, storageScope);
    clearLastGameCode(storageScope);
    clearLastHostCode(storageScope);
    router.push('/games');
  };

  if (!session) {
    return (
      <GameShell title="Game Results" subtitle="Wrapping up the session...">
        {error ? <p className="text-red-300">{error}</p> : <p className="text-white/70">Loading...</p>}
      </GameShell>
    );
  }

  return (
    <GameShell title="Results" subtitle="Final standings and stats.">
      {error && <p className="text-red-300 mb-4">{error}</p>}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleExit}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold"
        >
          Close
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Leaderboard session={session} />
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <p className="text-white/70 text-sm uppercase tracking-wide">Final Snapshot</p>
            <div className="flex justify-between text-white/80 text-sm">
              <span>Game Duration</span>
              <span className="font-semibold">
                {session.settings.gameDurationMinutes ? `${session.settings.gameDurationMinutes} min` : 'No limit'}
              </span>
            </div>
            <div className="flex justify-between text-white/80 text-sm">
              <span>Time Remaining</span>
              <span className="font-semibold">{timeRemaining ?? '—'}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <p className="text-white/70 text-sm uppercase tracking-wide">Claps</p>
            <div className="flex items-center justify-between text-white/80 text-sm">
              <span>Your Claps</span>
              <span className="font-semibold">{player?.claps ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-white/80 text-sm">
              <span>Total Claps</span>
              <span className="font-semibold">{totalClaps}</span>
            </div>
            <button
              onClick={handleClap}
              className="w-full py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white font-semibold"
            >
              👏 Clap
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
            <p className="text-white/70 text-sm uppercase tracking-wide">Actions</p>
            <button
              onClick={handleExport}
              className="w-full py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white font-semibold"
            >
              Export Leaderboard CSV
            </button>
            <button
              onClick={handleExit}
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </GameShell>
  );
}
