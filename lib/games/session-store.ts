'use client';

const scopeKey = (scope?: string | null) => (scope && scope.trim() ? scope.trim() : 'guest');
const playerKey = (code: string, scope?: string | null) =>
  `studyhatch-game-player-${scopeKey(scope)}-${code}`;
const hostKey = (code: string, scope?: string | null) =>
  `studyhatch-game-host-${scopeKey(scope)}-${code}`;
const lastHostKey = (scope?: string | null) => `studyhatch-game-last-host-code-${scopeKey(scope)}`;
const lastGameKey = (scope?: string | null) => `studyhatch-game-last-code-${scopeKey(scope)}`;

export const getStoredPlayerId = (code: string, scope?: string | null) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(playerKey(code, scope));
};

export const setStoredPlayerId = (code: string, playerId: string, scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(playerKey(code, scope), playerId);
};

export const getStoredHostKey = (code: string, scope?: string | null) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(hostKey(code, scope));
};

export const setStoredHostKey = (code: string, key: string, scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(hostKey(code, scope), key);
};

export const getLastHostCode = (scope?: string | null) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(lastHostKey(scope));
};

export const setLastHostCode = (code: string, scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(lastHostKey(scope), code);
};

export const clearLastHostCode = (scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(lastHostKey(scope));
};

export const getLastGameCode = (scope?: string | null) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(lastGameKey(scope));
};

export const setLastGameCode = (code: string, scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(lastGameKey(scope), code);
};

export const clearLastGameCode = (scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(lastGameKey(scope));
};

export const clearStoredGame = (code: string, scope?: string | null) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(playerKey(code, scope));
  window.localStorage.removeItem(hostKey(code, scope));
};
