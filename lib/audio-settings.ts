import { useEffect, useState } from 'react';

export type AudioSettings = {
  homeMusic: { muted: boolean; volume: number };
  gameMusic: { muted: boolean; volume: number };
  correctSfx: { muted: boolean; volume: number };
  incorrectSfx: { muted: boolean; volume: number };
};

const STORAGE_KEY = 'studyhatch_audio_settings';

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

const defaultSettings: AudioSettings = {
  homeMusic: { muted: false, volume: 0.35 },
  gameMusic: { muted: false, volume: 0.35 },
  correctSfx: { muted: false, volume: 0.6 },
  incorrectSfx: { muted: false, volume: 0.6 },
};

const normalizeSettings = (value: Partial<AudioSettings> | null): AudioSettings => ({
  homeMusic: {
    muted: value?.homeMusic?.muted ?? defaultSettings.homeMusic.muted,
    volume: clampVolume(value?.homeMusic?.volume ?? defaultSettings.homeMusic.volume),
  },
  gameMusic: {
    muted: value?.gameMusic?.muted ?? defaultSettings.gameMusic.muted,
    volume: clampVolume(value?.gameMusic?.volume ?? defaultSettings.gameMusic.volume),
  },
  correctSfx: {
    muted: value?.correctSfx?.muted ?? defaultSettings.correctSfx.muted,
    volume: clampVolume(value?.correctSfx?.volume ?? defaultSettings.correctSfx.volume),
  },
  incorrectSfx: {
    muted: value?.incorrectSfx?.muted ?? defaultSettings.incorrectSfx.muted,
    volume: clampVolume(value?.incorrectSfx?.volume ?? defaultSettings.incorrectSfx.volume),
  },
});

export const getAudioSettings = (): AudioSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return normalizeSettings(parsed);
  } catch {
    return defaultSettings;
  }
};

export const setAudioSettings = (settings: AudioSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('audio-settings'));
};

export const updateAudioSettings = (updates: Partial<AudioSettings>) => {
  const current = getAudioSettings();
  const next: AudioSettings = normalizeSettings({
    ...current,
    ...updates,
    homeMusic: { ...current.homeMusic, ...updates.homeMusic },
    gameMusic: { ...current.gameMusic, ...updates.gameMusic },
    correctSfx: { ...current.correctSfx, ...updates.correctSfx },
    incorrectSfx: { ...current.incorrectSfx, ...updates.incorrectSfx },
  });
  setAudioSettings(next);
};

export const useAudioSettings = () => {
  const [settings, setSettingsState] = useState<AudioSettings>(() => getAudioSettings());

  useEffect(() => {
    const syncSettings = () => setSettingsState(getAudioSettings());
    window.addEventListener('storage', syncSettings);
    window.addEventListener('audio-settings', syncSettings);
    return () => {
      window.removeEventListener('storage', syncSettings);
      window.removeEventListener('audio-settings', syncSettings);
    };
  }, []);

  return { settings, updateSettings: updateAudioSettings };
};
