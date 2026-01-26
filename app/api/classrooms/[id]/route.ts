import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-server';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const classroom = await prisma.classRoom.findUnique({
    where: { id: params.id },
    include: {
      school: true,
      memberships: { include: { user: true } },
    },
  });
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found.' }, { status: 404 });
  }
  const isMember = classroom.memberships.some((member) => member.userId === user.id);
  const isOwner = user.role === 'teacher' && classroom.ownerId === user.id;
  const isSchoolTeacher = user.role === 'teacher'
    && classroom.school
    && (await prisma.schoolTeacher.findFirst({
      where: { schoolId: classroom.schoolId, teacherId: user.id },
    }));
  if (!isMember && !isOwner && !isSchoolTeacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({
    classroom: {
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      joinCode: classroom.joinCode,
      schoolName: classroom.school.name,
      students: classroom.memberships.map((member) => ({
        userId: member.userId,
        username: member.user.username,
      })),
    },
  });
}
