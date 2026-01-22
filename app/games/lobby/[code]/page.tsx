'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GameShell from '@/components/games/GameShell';
import LobbyPanel from '@/components/games/LobbyPanel';
import type { GameSession } from '@/types/games';
import { createGameSocket } from '@/lib/games/ws-client';
import { useAuth } from '@/lib/auth-context';
import { getStoredHostKey, getStoredPlayerId, setStoredHostKey, setStoredPlayerId } from '@/lib/games/session-store';

export default function GameLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { session: authSession } = useAuth();
  const code = String(params.code || '').toUpperCase();
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(getStoredPlayerId(code));
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
          setPlayerId(message.payload.playerId);
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

  useEffect(() => {
    if (!session) return;
    if (session.status === 'playing') {
      router.push(`/games/play/${session.code}`);
    }
    if (session.status === 'ended') {
      router.push(`/games/results/${session.code}`);
    }
  }, [session, router]);

  const handleStart = () => socketRef.current?.send('start_game');
  const handleResume = () => socketRef.current?.send('resume_game');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      // ignore clipboard errors
    }
  };

  if (!session) {
    return (
      <GameShell title="Game Lobby" subtitle="Connecting to game session...">
        {error ? <p className="text-red-300">{error}</p> : <p className="text-white/70">Loading...</p>}
      </GameShell>
    );
  }

  return (
    <GameShell title="Game Lobby" subtitle="Gather players and start when ready.">
      {error && <p className="text-red-300 mb-4">{error}</p>}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-white/70 text-sm">
          Share this code: <span className="text-emerald-300 font-semibold">{code}</span>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
        >
          Copy Code
        </button>
      </div>
      <LobbyPanel session={session} playerId={playerId} onStart={handleStart} onResume={handleResume} />
    </GameShell>
  );
}
