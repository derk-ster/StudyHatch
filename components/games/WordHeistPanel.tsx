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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-white/60 text-xs uppercase tracking-wide">Vault</p>
          <p className="text-3xl font-bold text-emerald-200 mt-1">{player.bankedKeys}</p>
          <p className="text-white/50 text-xs mt-1">Safe points</p>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <p className="text-white/60 text-xs uppercase tracking-wide">At Risk</p>
          <p className="text-3xl font-bold text-amber-200 mt-1">{player.unbankedKeys}</p>
          <p className="text-white/50 text-xs mt-1">Stealable keys</p>
        </div>
      </div>

      {player.shielded && (
        <div className="text-sm text-blue-200 bg-blue-500/20 border border-blue-400/40 rounded-lg px-3 py-2 animate-pulse">
          Shield active — blocks one heist attempt.
        </div>
      )}

      {player.pendingDecision && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-white/70 text-sm">Choose your next move:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={onBank}
              className="py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-all text-white font-semibold"
            >
              Bank Keys
            </button>
            <button
              onClick={onRisk}
              className="py-2 rounded-lg bg-amber-500 hover:bg-amber-600 transition-all text-white font-semibold"
            >
              Risk Keys
            </button>
          </div>
        </div>
      )}

      {player.lastEvent && (
        <div className="text-sm text-white/80 bg-white/10 border border-white/10 rounded-lg px-3 py-2">
          {player.lastEvent}
        </div>
      )}
    </div>
  );
}
