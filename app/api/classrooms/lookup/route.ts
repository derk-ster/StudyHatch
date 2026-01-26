import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Class code required.' }, { status: 400 });
  }
  const classroom = await prisma.classRoom.findUnique({
    where: { joinCode: code.trim().toUpperCase() },
    select: { id: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
  }
  return NextResponse.json({ exists: true });
}
