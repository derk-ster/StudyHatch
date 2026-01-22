'use client';

import type { GameSession } from '@/types/games';

type LightningLadderPanelProps = {
  session: GameSession;
};

export default function LightningLadderPanel({ session }: LightningLadderPanelProps) {
  const sorted = [...session.players].sort((a, b) => b.ladderPosition - a.ladderPosition);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-white/70 text-sm uppercase tracking-wide mb-4">Lightning Ladder</p>
      <div className="space-y-3">
        {sorted.map(player => (
          <div key={player.id} className="flex items-center gap-3">
            <div className="w-24 text-white font-semibold">{player.name}</div>
            <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all"
                style={{ width: `${Math.min(100, (player.ladderPosition / 10) * 100)}%` }}
              />
            </div>
            <div className="w-10 text-right text-white/70">{player.ladderPosition}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
