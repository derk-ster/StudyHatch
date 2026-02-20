import { NextRequest, NextResponse } from 'next/server';
import { getSharePayload } from '@/lib/share-store';

/** GET: return stored payload for short share id. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const payload = getSharePayload(id.trim());
  if (!payload) {
    return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  }
  return NextResponse.json({ payload });
}
