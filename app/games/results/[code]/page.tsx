'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import Leaderboard from '@/components/games/Leaderboard';
import type { GameSession } from '@/types/games';
import { createGameSocket } from '@/lib/games/ws-client';
import { useAuth } from '@/lib/auth-context';
import { getStoredHostKey, setStoredHostKey, setStoredPlayerId, clearStoredGame } from '@/lib/games/session-store';

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
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState('');
  const socketRef = useRef<ReturnType<typeof createGameSocket> | null>(null);

  useEffect(() => {
    if (!code) return;
    const name =
      localStorage.getItem('studyhatch-game-display-name') ||
      authSession?.username ||
      'Player';
    const hostKey = getStoredHostKey(code);
    const socket = createGameSocket({
      onMessage: (message) => {
        if (message.type === 'error') {
          setError(message.payload.message);
          return;
        }
        if (message.type === 'session_joined') {
          setStoredPlayerId(message.payload.code, message.payload.playerId);
          if (message.payload.hostKey) {
            setStoredHostKey(message.payload.code, message.payload.hostKey);
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
        });
      },
    });
    socketRef.current = socket;
    return () => socket.close();
  }, [code, authSession?.userId, authSession?.username, authSession?.isGuest]);

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
    clearStoredGame(code);
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
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Leaderboard session={session} />
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
            Back to Games
          </button>
        </div>
      </div>
    </GameShell>
  );
}
