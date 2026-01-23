'use client';

import type { GamePlayer } from '@/types/games';

type WordHeistPanelProps = {
  player: GamePlayer;
  players: GamePlayer[];
  playerId: string | null;
  stealMode: boolean;
  decisionLocked: boolean;
  onBank: () => void;
  onRisk: () => void;
  onStealStart: () => void;
  onStealTarget: (targetId: string) => void;
  onStealCancel: () => void;
};

export default function WordHeistPanel({
  player,
  players,
  playerId,
  stealMode,
  decisionLocked,
  onBank,
  onRisk,
  onStealStart,
  onStealTarget,
  onStealCancel,
}: WordHeistPanelProps) {
  const targets = players.filter(p => p.id !== playerId);
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

      {player.pendingDecision && !stealMode && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-white/70 text-sm">Choose your next move:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={onBank}
              disabled={decisionLocked}
              className="py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition-all text-white font-semibold disabled:opacity-60"
            >
              Bank Keys
            </button>
            <button
              onClick={onRisk}
              disabled={decisionLocked}
              className="py-2 rounded-lg bg-amber-500 hover:bg-amber-600 transition-all text-white font-semibold disabled:opacity-60"
            >
              Risk Keys
            </button>
            <button
              onClick={onStealStart}
              disabled={decisionLocked}
              className="py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all text-white font-semibold disabled:opacity-60"
            >
              Steal Key
            </button>
          </div>
        </div>
      )}

      {player.pendingDecision && stealMode && (
        <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 space-y-3">
          <p className="text-white/70 text-sm">Pick someone to steal from (50% chance):</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {targets.map(target => (
              <button
                key={target.id}
                onClick={() => onStealTarget(target.id)}
                disabled={decisionLocked}
                className="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold disabled:opacity-60"
              >
                {target.name}
              </button>
            ))}
          </div>
          {targets.length === 0 && (
            <p className="text-white/60 text-sm">No other players to steal from.</p>
          )}
          <button
            onClick={onStealCancel}
            disabled={decisionLocked}
            className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold disabled:opacity-60"
          >
            Back
          </button>
        </div>
      )}

      {player.lastEvent && (
        <div
          className={`text-sm rounded-lg px-3 py-2 border ${
            player.lastEventTone === 'positive'
              ? 'text-emerald-100 bg-emerald-500/15 border-emerald-400/30'
              : player.lastEventTone === 'negative'
                ? 'text-rose-100 bg-rose-500/15 border-rose-400/30'
                : 'text-white/80 bg-white/10 border-white/10'
          }`}
        >
          {player.lastEvent}
        </div>
      )}
    </div>
  );
}
