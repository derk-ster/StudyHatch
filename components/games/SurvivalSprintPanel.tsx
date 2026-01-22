'use client';

import type { GameSession } from '@/types/games';

type SurvivalSprintPanelProps = {
  session: GameSession;
};

const renderHearts = (count: number) =>
  Array.from({ length: 3 }, (_, idx) => (
    <span key={idx} className={idx < count ? 'text-rose-400' : 'text-white/30'}>
      ♥
    </span>
  ));

export default function SurvivalSprintPanel({ session }: SurvivalSprintPanelProps) {
  const sorted = [...session.players].sort((a, b) => b.hearts - a.hearts || b.score - a.score);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-white/70 text-sm uppercase tracking-wide mb-4">Survival Status</p>
      <div className="space-y-2">
        {sorted.map(player => (
          <div key={player.id} className="flex items-center justify-between text-white">
            <span className="font-semibold">{player.name}</span>
            <div className="flex items-center gap-2 text-lg">
              {renderHearts(player.hearts)}
              <span className="text-sm text-white/70">Score {player.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
