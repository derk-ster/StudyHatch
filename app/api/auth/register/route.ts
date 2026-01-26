import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const generateInviteCode = (length = 6): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const getUniqueInviteCode = async (): Promise<string> => {
  const code = generateInviteCode();
  const existing = await prisma.school.findUnique({ where: { inviteCode: code } });
  if (existing) {
    return getUniqueInviteCode();
  }
  return code;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      username,
      password,
      role,
      schoolName,
      schoolDescription,
      classCode,
    } = body as {
      email?: string;
      username?: string;
      password?: string;
      role?: 'teacher' | 'student';
      schoolName?: string;
      schoolDescription?: string;
      classCode?: string;
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    if (role === 'teacher' && !schoolName?.trim()) {
      return NextResponse.json({ error: 'School name is required for teachers.' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username: username.trim() }],
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'User already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.trim(),
        passwordHash,
        role: role || 'student',
      },
    });

    if (role === 'teacher') {
      const inviteCode = await getUniqueInviteCode();
      const school = await prisma.school.create({
        data: {
          name: schoolName!.trim(),
          description: schoolDescription?.trim() || null,
          inviteCode,
          createdById: user.id,
          teachers: {
            create: { teacherId: user.id },
          },
        },
      });
      return NextResponse.json({ userId: user.id, schoolId: school.id });
    }

    if (role === 'student' && classCode?.trim()) {
      const classroom = await prisma.classRoom.findUnique({
        where: { joinCode: classCode.trim().toUpperCase() },
      });
      if (classroom) {
        await prisma.classroomMembership.upsert({
          where: { classroomId_userId: { classroomId: classroom.id, userId: user.id } },
          update: {},
          create: { classroomId: classroom.id, userId: user.id },
        });
      }
    }

    return NextResponse.json({ userId: user.id });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register.' }, { status: 500 });
  }
}
