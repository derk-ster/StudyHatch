import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { code } = body as { code?: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: 'Invite code required.' }, { status: 400 });
  }
  const school = await prisma.school.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
  });
  if (!school) {
    return NextResponse.json({ error: 'School invite code not found.' }, { status: 404 });
  }
  await prisma.schoolTeacher.upsert({
    where: { schoolId_teacherId: { schoolId: school.id, teacherId: user.id } },
    update: {},
    create: { schoolId: school.id, teacherId: user.id },
  });

  return NextResponse.json({ school });
}
