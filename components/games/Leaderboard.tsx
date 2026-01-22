'use client';

import type { GameSession, GameMode } from '@/types/games';

type LeaderboardEntry = {
  id: string;
  name: string;
  primary: number;
  secondary?: number;
  tertiary?: number;
};

const buildLeaderboard = (session: GameSession): LeaderboardEntry[] => {
  if (session.mode === 'word-heist') {
    return session.players
      .map(player => ({
        id: player.id,
        name: player.name,
        primary: player.bankedKeys,
        secondary: player.unbankedKeys,
      }))
      .sort((a, b) => (b.primary - a.primary) || (b.secondary || 0) - (a.secondary || 0));
  }

  if (session.mode === 'lightning-ladder') {
    return session.players
      .map(player => ({
        id: player.id,
        name: player.name,
        primary: player.ladderPosition,
      }))
      .sort((a, b) => b.primary - a.primary);
  }

  return session.players
    .map(player => ({
      id: player.id,
      name: player.name,
      primary: player.hearts,
      secondary: player.score,
    }))
    .sort((a, b) => (b.primary - a.primary) || (b.secondary || 0) - (a.secondary || 0));
};

type LeaderboardProps = {
  session: GameSession;
  title?: string;
};

const getPrimaryLabel = (mode: GameMode) => {
  if (mode === 'word-heist') return 'Banked';
  if (mode === 'lightning-ladder') return 'Ladder';
  return 'Hearts';
};

export default function Leaderboard({ session, title }: LeaderboardProps) {
  const entries = buildLeaderboard(session);
  const primaryLabel = getPrimaryLabel(session.mode);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-white/70 text-sm uppercase tracking-wide">{title || 'Leaderboard'}</p>
      <div className="mt-4 space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              index === 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold w-6 text-right">{index + 1}</span>
              <span className="font-semibold">{entry.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span>
                {primaryLabel}: <strong>{entry.primary}</strong>
              </span>
              {session.mode === 'word-heist' && (
                <span className="text-white/70">At Risk: {entry.secondary || 0}</span>
              )}
              {session.mode === 'survival-sprint' && (
                <span className="text-white/70">Score: {entry.secondary || 0}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
