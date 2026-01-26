 'use client';

import { useEffect, useMemo, useRef } from 'react';
 import { usePathname } from 'next/navigation';
import { useAudioSettings } from '@/lib/audio-settings';

 const MIN_PAUSE_MS = 30_000;
 const MAX_PAUSE_MS = 60_000;
const FADE_IN_MS = 1500;
const FADE_OUT_MS = 1500;

 const multiplayerPathSegments = ['/games/play', '/games/lobby', '/games/results'];

 const randomPauseMs = () =>
   Math.floor(Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS + 1)) + MIN_PAUSE_MS;

 export default function BackgroundMusic() {
   const pathname = usePathname();
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const timeoutRef = useRef<number | null>(null);
   const startedRef = useRef(false);
  const fadeRef = useRef<number | null>(null);
  const fadeOutRef = useRef(false);
  const settingsRef = useRef<{ targetVolume: number; isMuted: boolean }>({
    targetVolume: 0,
    isMuted: false,
  });
   const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const { settings } = useAudioSettings();

   const isMultiplayer = useMemo(() => {
     if (!pathname) return false;
     return multiplayerPathSegments.some((segment) => pathname.startsWith(segment));
   }, [pathname]);

  const { targetVolume, isMuted } = useMemo(() => {
    const musicSettings = isMultiplayer ? settings.gameMusic : settings.homeMusic;
    return {
      targetVolume: musicSettings.volume,
      isMuted: musicSettings.muted,
    };
  }, [isMultiplayer, settings.gameMusic, settings.homeMusic]);

  const sourceUrl = useMemo(() => {
    const fileName = isMultiplayer ? 'GameBGMusci.wav' : 'BGMusic.wav';
     return `${basePath}/audio/${fileName}`;
   }, [basePath, isMultiplayer]);

  const cancelFade = () => {
    if (fadeRef.current) {
      window.cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  };

  const fadeTo = (audio: HTMLAudioElement, from: number, to: number, durationMs: number, onDone?: () => void) => {
    cancelFade();
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      audio.volume = from + (to - from) * progress;
      if (progress < 1) {
        fadeRef.current = window.requestAnimationFrame(step);
      } else {
        fadeRef.current = null;
        onDone?.();
      }
    };
    audio.volume = from;
    fadeRef.current = window.requestAnimationFrame(step);
  };

   useEffect(() => {
    settingsRef.current = { targetVolume, isMuted };
  }, [targetVolume, isMuted]);

  useEffect(() => {
     const audio = new Audio(sourceUrl);
    audio.volume = Math.max(0, Math.min(1, settingsRef.current.targetVolume));
     audioRef.current = audio;

    const startPlayback = () => {
      const { isMuted: muted, targetVolume: volume } = settingsRef.current;
      if (startedRef.current || muted) return;
      startedRef.current = true;
      fadeOutRef.current = false;
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore if not ready yet.
      }
      audio.play().then(() => {
        fadeTo(audio, 0, volume, FADE_IN_MS);
      }).catch(() => {
        // If blocked, we stay idle until next interaction.
      });
    };

     const scheduleNextPlay = () => {
       if (timeoutRef.current) {
         window.clearTimeout(timeoutRef.current);
       }
       timeoutRef.current = window.setTimeout(() => {
        const { isMuted: muted, targetVolume: volume } = settingsRef.current;
        if (muted) return;
        fadeOutRef.current = false;
        try {
          audio.currentTime = 0;
        } catch {
          // Ignore if not ready yet.
        }
        audio.play().then(() => {
          fadeTo(audio, 0, volume, FADE_IN_MS);
        }).catch(() => {
          // Ignore autoplay errors; user interaction will restart.
        });
       }, randomPauseMs());
     };

    const handleTimeUpdate = () => {
      if (!audio.duration || fadeOutRef.current) return;
      const remaining = audio.duration - audio.currentTime;
      if (remaining <= FADE_OUT_MS / 1000) {
        fadeOutRef.current = true;
        fadeTo(audio, audio.volume, 0, FADE_OUT_MS);
      }
    };

     const handleEnded = () => {
      fadeOutRef.current = false;
       scheduleNextPlay();
     };

     audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
     window.addEventListener('pointerdown', startPlayback, { once: true });
     window.addEventListener('keydown', startPlayback, { once: true });

     return () => {
      cancelFade();
       audio.pause();
       audio.src = '';
       audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
       if (timeoutRef.current) {
         window.clearTimeout(timeoutRef.current);
       }
       window.removeEventListener('pointerdown', startPlayback);
       window.removeEventListener('keydown', startPlayback);
     };
  }, [sourceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      fadeTo(audio, audio.volume, 0, FADE_OUT_MS, () => {
        audio.pause();
      });
      return;
    }
    if (!audio.paused) {
      audio.volume = targetVolume;
    }
  }, [isMuted, targetVolume]);

   return null;
 }
