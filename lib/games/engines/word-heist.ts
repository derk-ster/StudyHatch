import type { GameMode } from '@/types/games';

export const WORD_HEIST_MODE: {
  id: GameMode;
  name: string;
  description: string;
  highlights: string[];
} = {
  id: 'word-heist',
  name: 'Word Heist',
  description:
    'Earn keys with correct answers, then decide to bank them safely or risk a heist action.',
  highlights: [
    'Banked keys are safe points.',
    'Risking keys triggers a random heist outcome.',
    'Shield blocks one theft attempt.',
  ],
};
