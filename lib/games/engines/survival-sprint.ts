import type { GameMode } from '@/types/games';

export const SURVIVAL_SPRINT_MODE: {
  id: GameMode;
  name: string;
  description: string;
  highlights: string[];
} = {
  id: 'survival-sprint',
  name: 'Survival Sprint',
  description: 'Answer together each round. Misses cost hearts. Last alive wins.',
  highlights: [
    'Everyone answers the same prompt.',
    'Wrong answers cost one heart.',
    'Speed bonuses add points.',
  ],
};
