import { getAudioSettings } from '@/lib/audio-settings';

type SfxType = 'correct' | 'incorrect';

const AUDIO_FILES: Record<SfxType, string> = {
  correct: 'Correct.wav',
  incorrect: 'InCorrect.wav',
};

const audioCache: Partial<Record<SfxType, HTMLAudioElement>> = {};

export const playSfx = (type: SfxType) => {
  if (typeof window === 'undefined') return;
  const settings = getAudioSettings();
  const config = type === 'correct' ? settings.correctSfx : settings.incorrectSfx;
  if (config.muted || config.volume <= 0) return;

  let audio = audioCache[type];
  if (!audio) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    audio = new Audio(`${basePath}/audio/${AUDIO_FILES[type]}`);
    audio.preload = 'auto';
    audioCache[type] = audio;
  }

  audio.volume = config.volume;
  try {
    audio.currentTime = 0;
  } catch {
    // Ignore if media isn't ready yet.
  }

  audio.play().catch(() => {
    // Ignore autoplay errors; user interaction will allow playback.
  });
};
