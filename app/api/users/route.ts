export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

type User = import('@/types/auth').User;
type AccountData = import('@/types/auth').AccountData;
type StoredUser = { user: User; passwordHash: unknown; accountData: AccountData };

async function readUsers(): Promise<Record<string, StoredUser>> {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return typeof data === 'object' && data !== null ? data : {};
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeUsers(users: Record<string, StoredUser>): Promise<void> {
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 0), 'utf-8');
}

export async function GET() {
  try {
    const users = await readUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const incoming = (body?.users ?? body) as Record<string, StoredUser>;
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ error: 'Invalid body: expected { users: {...} }' }, { status: 400 });
    }
    const existing = await readUsers();
    const merged = { ...existing };
    for (const [id, entry] of Object.entries(incoming)) {
      if (entry && typeof entry === 'object' && entry.user) {
        merged[id] = entry as StoredUser;
      }
    }
    await writeUsers(merged);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: 'Failed to save users' }, { status: 500 });
  }
}
