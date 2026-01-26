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
  });
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found.' }, { status: 404 });
  }
  const isOwner = classroom.ownerId === user.id;
  if (!isOwner) {
    const membership = await prisma.classroomMembership.findFirst({
      where: { classroomId: params.id, userId: user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const settings = await prisma.classroomSettings.upsert({
    where: { classroomId: params.id },
    create: { classroomId: params.id },
    update: {},
  });

  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const classroom = await prisma.classRoom.findUnique({
    where: { id: params.id },
  });
  if (!classroom || classroom.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { defaultLeaderboardType, aiTutorEnabled, multiplayerEnabled, studentDecksEnabled } = body as {
    defaultLeaderboardType?: string;
    aiTutorEnabled?: boolean;
    multiplayerEnabled?: boolean;
    studentDecksEnabled?: boolean;
  };
  const allowedTypes = new Set(['total_points', 'weekly_points', 'quiz_accuracy', 'games_won', 'streak_days']);
  if (defaultLeaderboardType && !allowedTypes.has(defaultLeaderboardType)) {
    return NextResponse.json({ error: 'Invalid leaderboard type.' }, { status: 400 });
  }

  const updated = await prisma.classroomSettings.upsert({
    where: { classroomId: params.id },
    create: {
      classroomId: params.id,
      defaultLeaderboardType,
      aiTutorEnabled: aiTutorEnabled ?? false,
      multiplayerEnabled: multiplayerEnabled ?? true,
      studentDecksEnabled: studentDecksEnabled ?? false,
      updatedById: user.id,
    },
    update: {
      defaultLeaderboardType,
      aiTutorEnabled,
      multiplayerEnabled,
      studentDecksEnabled,
      updatedById: user.id,
    },
  });

  return NextResponse.json({ settings: updated });
}
