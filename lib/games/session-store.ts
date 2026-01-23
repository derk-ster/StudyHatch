'use client';

const playerKey = (code: string) => `studyhatch-game-player-${code}`;
const hostKey = (code: string) => `studyhatch-game-host-${code}`;
const lastHostKey = () => 'studyhatch-game-last-host-code';
const lastGameKey = () => 'studyhatch-game-last-code';

export const getStoredPlayerId = (code: string) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(playerKey(code));
};

export const setStoredPlayerId = (code: string, playerId: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(playerKey(code), playerId);
};

export const getStoredHostKey = (code: string) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(hostKey(code));
};

export const setStoredHostKey = (code: string, key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(hostKey(code), key);
};

export const getLastHostCode = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(lastHostKey());
};

export const setLastHostCode = (code: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(lastHostKey(), code);
};

export const clearLastHostCode = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(lastHostKey());
};

export const getLastGameCode = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(lastGameKey());
};

export const setLastGameCode = (code: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(lastGameKey(), code);
};

export const clearLastGameCode = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(lastGameKey());
};

export const clearStoredGame = (code: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(playerKey(code));
  window.localStorage.removeItem(hostKey(code));
};
