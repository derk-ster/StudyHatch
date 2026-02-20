/**
 * Server-side only: persistent store for short share IDs -> payload (base64).
 * Uses Redis when REDIS_URL is set (production/serverless). Otherwise uses a JSON file (local dev).
 */
import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'share-store.json');
const REDIS_KEY_PREFIX = 'studyhatch:share:';

type Store = Record<string, string>;

let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (redisClient !== null) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url || typeof url !== 'string') return null;
  try {
    const useTls = url.startsWith('rediss://');
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 5000,
      ...(useTls ? { tls: {} } : {}),
    });
    return redisClient;
  } catch {
    return null;
  }
}

function ensureDir() {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function readStoreSync(): Store {
  ensureDir();
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

/** Returns true if write succeeded. On serverless (read-only FS) this is false unless using Redis. */
function writeStoreSync(store: Store): boolean {
  ensureDir();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 0), 'utf-8');
    return true;
  } catch (e) {
    console.warn('Share store file write failed (set REDIS_URL in production):', (e as Error).message);
    return false;
  }
}

// In-memory fallback when file is read-only (same process only)
const memoryStore: Store = {};
function getMemoryStore(): Store {
  return memoryStore;
}

/** Get payload by short id. Uses Redis if REDIS_URL set, else file, else memory (same-process fallback). */
export async function getSharePayload(id: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const key = REDIS_KEY_PREFIX + id;
      const value = await redis.get(key);
      if (value) return value;
    } catch (e) {
      console.warn('Share store Redis get failed:', (e as Error).message);
    }
  }
  const fileStore = readStoreSync();
  if (id in fileStore) return fileStore[id];
  const mem = getMemoryStore()[id];
  if (mem) return mem;
  return null;
}

/** Store payload by short id. Uses Redis when REDIS_URL set; else file; always set memory for same-process fallback. */
export async function setSharePayload(id: string, payload: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      const key = REDIS_KEY_PREFIX + id;
      await redis.set(key, payload, 'EX', 60 * 60 * 24 * 30); // 30 days TTL
      getMemoryStore()[id] = payload;
      return;
    } catch (e) {
      console.warn('Share store Redis set failed:', (e as Error).message);
    }
  }
  getMemoryStore()[id] = payload;
  const store = readStoreSync();
  store[id] = payload;
  const written = writeStoreSync(store);
  if (!written) {
    throw new Error('Share store unavailable. Set REDIS_URL in production for short links.');
  }
}

/** Check if id exists. Uses Redis if set, else file, else memory. */
export async function hasShareId(id: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const key = REDIS_KEY_PREFIX + id;
      const exists = await redis.exists(key);
      if (exists === 1) return true;
    } catch (e) {
      console.warn('Share store Redis exists failed:', (e as Error).message);
    }
  }
  const fileStore = readStoreSync();
  if (id in fileStore) return true;
  return id in getMemoryStore();
}
