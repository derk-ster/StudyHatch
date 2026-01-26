import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { code } = body as { code?: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: 'Class code required.' }, { status: 400 });
  }
  const classroom = await prisma.classRoom.findUnique({
    where: { joinCode: code.trim().toUpperCase() },
  });
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found.' }, { status: 404 });
  }

  await prisma.classroomMembership.upsert({
    where: { classroomId_userId: { classroomId: classroom.id, userId: user.id } },
    update: {},
    create: { classroomId: classroom.id, userId: user.id },
  });

  return NextResponse.json({ classroom });
}
