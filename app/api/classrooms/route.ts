import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-server';

const generateInviteCode = (length = 6): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const getUniqueJoinCode = async (): Promise<string> => {
  const code = generateInviteCode();
  const existing = await prisma.classRoom.findUnique({ where: { joinCode: code } });
  if (existing) {
    return getUniqueJoinCode();
  }
  return code;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'teacher') {
    const teacherSchool = await prisma.schoolTeacher.findFirst({
      where: { teacherId: user.id },
      include: { school: true },
    });
    if (!teacherSchool) {
      return NextResponse.json({ school: null, classes: [] });
    }
    const classes = await prisma.classRoom.findMany({
      where: { schoolId: teacherSchool.schoolId },
      include: {
        memberships: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      school: teacherSchool.school,
      classes: classes.map((cls: typeof classes[number]) => ({
        id: cls.id,
        name: cls.name,
        description: cls.description,
        joinCode: cls.joinCode,
        createdAt: cls.createdAt,
        students: cls.memberships.map((member: typeof cls.memberships[number]) => ({
          userId: member.userId,
          username: member.user.username,
        })),
      })),
    });
  }

  const memberships = await prisma.classroomMembership.findMany({
    where: { userId: user.id },
    include: { classroom: true },
  });
  return NextResponse.json({
    classes: memberships.map((membership: typeof memberships[number]) => ({
      id: membership.classroom.id,
      name: membership.classroom.name,
      description: membership.classroom.description,
      joinCode: membership.classroom.joinCode,
      createdAt: membership.classroom.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body as { name?: string; description?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Class name is required.' }, { status: 400 });
  }

  const teacherSchool = await prisma.schoolTeacher.findFirst({
    where: { teacherId: user.id },
  });
  if (!teacherSchool) {
    return NextResponse.json({ error: 'School not found.' }, { status: 404 });
  }

  const joinCode = await getUniqueJoinCode();
  const classroom = await prisma.classRoom.create({
    data: {
      schoolId: teacherSchool.schoolId,
      name: name.trim(),
      description: description?.trim() || null,
      joinCode,
      ownerId: user.id,
    },
  });

  return NextResponse.json({ classroom });
}
