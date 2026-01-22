'use client';

import type { GameSession } from '@/types/games';
import { WORD_HEIST_MODE } from '@/lib/games/engines/word-heist';
import { LIGHTNING_LADDER_MODE } from '@/lib/games/engines/lightning-ladder';
import { SURVIVAL_SPRINT_MODE } from '@/lib/games/engines/survival-sprint';

const MODE_MAP = {
  'word-heist': WORD_HEIST_MODE,
  'lightning-ladder': LIGHTNING_LADDER_MODE,
  'survival-sprint': SURVIVAL_SPRINT_MODE,
};

type LobbyPanelProps = {
  session: GameSession;
  playerId: string | null;
  onStart: () => void;
  onResume: () => void;
};

export default function LobbyPanel({ session, playerId, onStart, onResume }: LobbyPanelProps) {
  const modeInfo = MODE_MAP[session.mode];
  const players = [...session.players].sort((a, b) => b.joinedAt - a.joinedAt);
  const isHost = playerId === session.hostId;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/60 text-sm uppercase tracking-wide">Game Mode</p>
              <h2 className="text-2xl font-semibold text-white">{modeInfo.name}</h2>
              <p className="text-white/70 mt-1">{modeInfo.description}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">Game Code</p>
              <p className="text-3xl font-bold text-emerald-300 tracking-widest">{session.code}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-white/70 text-sm">
            {modeInfo.highlights.map(item => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-white/60 text-sm uppercase tracking-wide">Players</p>
          <div className="mt-3 space-y-2">
            {players.map(player => (
              <div key={player.id} className="flex items-center justify-between text-white">
                <span className="font-medium">
                  {player.name}
                  {player.id === session.hostId && (
                    <span className="ml-2 text-xs text-purple-300">(Host)</span>
                  )}
                </span>
                <span className={`text-xs ${player.connected ? 'text-emerald-300' : 'text-white/40'}`}>
                  {player.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-white/60 text-sm uppercase tracking-wide">Settings</p>
          <div className="mt-4 space-y-2 text-white/80 text-sm">
            <div className="flex justify-between">
              <span>Deck</span>
              <span className="font-semibold">{session.deck.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Direction</span>
              <span className="font-semibold">
                {session.settings.direction === 'en-to-target' ? 'EN → Target' : 'Target → EN'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Time / Question</span>
              <span className="font-semibold">{session.settings.timePerQuestion}s</span>
            </div>
            <div className="flex justify-between">
              <span>Max Players</span>
              <span className="font-semibold">
                {session.settings.maxPlayers ? session.settings.maxPlayers : 'Open'}
              </span>
            </div>
            {session.settings.classroomOnly && (
              <div className="flex justify-between">
                <span>Classroom Only</span>
                <span className="font-semibold">Yes</span>
              </div>
            )}
          </div>
        </div>

        {isHost && (
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-5 text-center">
            <p className="text-white/70 mb-4">Share the code and start when ready.</p>
            {session.status === 'paused' ? (
              <button
                onClick={onResume}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-all font-semibold text-white"
              >
                Resume Game
              </button>
            ) : (
              <button
                onClick={onStart}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 transition-all font-semibold text-white"
              >
                Start Game
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
