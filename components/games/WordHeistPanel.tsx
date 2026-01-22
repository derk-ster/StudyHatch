'use client';

import type { GamePlayer } from '@/types/games';

type WordHeistPanelProps = {
  player: GamePlayer;
  onBank: () => void;
  onRisk: () => void;
};

export default function WordHeistPanel({ player, onBank, onRisk }: WordHeistPanelProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm uppercase tracking-wide">Vault</p>
          <p className="text-3xl font-bold text-emerald-300">{player.bankedKeys}</p>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-sm uppercase tracking-wide">At Risk</p>
          <p className="text-3xl font-bold text-amber-300">{player.unbankedKeys}</p>
        </div>
      </div>

      {player.shielded && (
        <div className="text-sm text-blue-200 bg-blue-500/20 border border-blue-400/40 rounded-lg px-3 py-2 animate-pulse">
          Shield active — blocks one heist attempt.
        </div>
      )}

      {player.pendingDecision && (
        <div className="flex gap-3">
          <button
            onClick={onBank}
            className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-all text-white font-semibold"
          >
            Bank Keys
          </button>
          <button
            onClick={onRisk}
            className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 transition-all text-white font-semibold"
          >
            Risk Keys
          </button>
        </div>
      )}

      {player.lastEvent && (
        <div className="text-sm text-white/80 bg-white/10 border border-white/10 rounded-lg px-3 py-2 animate-pulse">
          {player.lastEvent}
        </div>
      )}
    </div>
  );
}
