/**
 * Server-side only: persistent store for short share IDs -> payload (base64).
 * Uses a JSON file so short links work across requests. For multi-instance deploy, use Redis/DB instead.
 */
import fs from 'fs';
import path from 'path';

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(STORE_DIR, 'share-store.json');

type Store = Record<string, string>;

function ensureDir() {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function readStore(): Store {
  ensureDir();
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 0), 'utf-8');
}

export function getSharePayload(id: string): string | null {
  const store = readStore();
  return store[id] ?? null;
}

export function setSharePayload(id: string, payload: string): void {
  const store = readStore();
  store[id] = payload;
  writeStore(store);
}

export function hasShareId(id: string): boolean {
  const store = readStore();
  return id in store;
}
