type Bucket = {
  windowStart: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export const rateLimit = (key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } => {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - bucket.windowStart)) };
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
};

export const getRateLimitKey = (fallback: string, headerValue?: string | null): string => {
  if (headerValue && headerValue.trim()) {
    return headerValue.split(',')[0]?.trim() || fallback;
  }
  return fallback;
};
