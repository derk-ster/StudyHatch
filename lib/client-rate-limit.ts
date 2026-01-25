type RateLimitState = {
  windowStart: number;
  count: number;
};

const getKey = (action: string) => `studyhatch-rate-${action}`;

export const checkClientRateLimit = (action: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } => {
  if (typeof window === 'undefined') {
    return { allowed: true, retryAfterMs: 0 };
  }

  try {
    const stored = localStorage.getItem(getKey(action));
    const now = Date.now();
    if (!stored) {
      return { allowed: true, retryAfterMs: 0 };
    }
    const state = JSON.parse(stored) as RateLimitState;
    if (now - state.windowStart >= windowMs) {
      return { allowed: true, retryAfterMs: 0 };
    }
    if (state.count >= limit) {
      return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - state.windowStart)) };
    }
    return { allowed: true, retryAfterMs: 0 };
  } catch (error) {
    return { allowed: true, retryAfterMs: 0 };
  }
};

export const recordClientRateLimit = (action: string, windowMs: number): void => {
  if (typeof window === 'undefined') return;
  try {
    const key = getKey(action);
    const stored = localStorage.getItem(key);
    const now = Date.now();
    if (!stored) {
      const state: RateLimitState = { windowStart: now, count: 1 };
      localStorage.setItem(key, JSON.stringify(state));
      return;
    }
    const state = JSON.parse(stored) as RateLimitState;
    if (now - state.windowStart >= windowMs) {
      localStorage.setItem(key, JSON.stringify({ windowStart: now, count: 1 }));
      return;
    }
    state.count += 1;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    // ignore storage errors
  }
};
