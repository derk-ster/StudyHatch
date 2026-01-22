import type { GameMode } from '@/types/games';

export const LIGHTNING_LADDER_MODE: {
  id: GameMode;
  name: string;
  description: string;
  highlights: string[];
} = {
  id: 'lightning-ladder',
  name: 'Lightning Ladder',
  description: 'Speed and accuracy move you up the ladder. Misses drop you down.',
  highlights: [
    'Fast correct answers climb faster.',
    'Wrong answers drop one rung.',
    'First to the top wins.',
  ],
};
