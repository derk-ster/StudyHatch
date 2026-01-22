'use client';

import type { GameSocketMessage } from '@/types/games';

type GameSocketOptions = {
  onMessage: (message: GameSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
};

const getWebSocketUrl = () => {
  if (typeof window === 'undefined') return '';
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return envUrl;
  return window.location.origin.replace(/^http/, 'ws');
};

export const createGameSocket = (options: GameSocketOptions) => {
  const socket = new WebSocket(getWebSocketUrl());
  socket.addEventListener('open', () => options.onOpen?.());
  socket.addEventListener('close', () => options.onClose?.());
  socket.addEventListener('error', (event) => options.onError?.(event));
  socket.addEventListener('message', (event) => {
    try {
      const parsed = JSON.parse(event.data as string) as GameSocketMessage;
      options.onMessage(parsed);
    } catch (error) {
      // ignore malformed messages
    }
  });

  const send = (type: string, payload?: Record<string, unknown>) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  const close = () => socket.close();

  return { socket, send, close };
};
