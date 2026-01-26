import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ClassroomLeaderboard, User } from '@prisma/client';
import { getSessionUser } from '@/lib/auth-server';
import { getRateLimitKey, rateLimit } from '@/lib/rate-limit';

const leaderboardFields = {
  total_points: 'totalPoints',
  weekly_points: 'weeklyPoints',
  quiz_accuracy: 'quizAccuracy',
  games_won: 'gamesWon',
  streak_days: 'streakDays',
} as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateKey = getRateLimitKey(user.id, request.headers.get('x-forwarded-for'));
  const rate = rateLimit(`leaderboard:${params.id}:${rateKey}`, 30, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const type = request.nextUrl.searchParams.get('type') || 'total_points';
  if (!(type in leaderboardFields)) {
    return NextResponse.json({ error: 'Invalid leaderboard type.' }, { status: 400 });
  }

  const classroom = await prisma.classRoom.findUnique({
    where: { id: params.id },
  });
  if (!classroom) {
    return NextResponse.json({ error: 'Classroom not found.' }, { status: 404 });
  }

  const isMember = await prisma.classroomMembership.findFirst({
    where: { classroomId: params.id, userId: user.id },
  });
  const isTeacher = user.role === 'teacher' && classroom.ownerId === user.id;
  if (!isMember && !isTeacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const resetBefore = new Date(Date.now() - WEEK_MS);
  await prisma.classroomLeaderboard.updateMany({
    where: {
      classroomId: params.id,
      lastWeekResetAt: { lt: resetBefore },
    },
    data: { weeklyPoints: 0, lastWeekResetAt: new Date() },
  });

  const orderField = leaderboardFields[type as keyof typeof leaderboardFields];
  const orderBy = { [orderField]: 'desc' } as Record<string, 'desc'>;
  const entries: Array<ClassroomLeaderboard & { user: User }> = await prisma.classroomLeaderboard.findMany({
    where: { classroomId: params.id },
    include: { user: true },
    orderBy: [orderBy, { updatedAt: 'desc' }],
    take: 50,
  });

  const formatted = entries.map((entry: ClassroomLeaderboard & { user: User }, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: entry.user.username,
    avatar: entry.user.image,
    score: (entry as Record<string, number>)[orderField],
  }));

  const currentEntry = await prisma.classroomLeaderboard.findUnique({
    where: { classroomId_userId: { classroomId: params.id, userId: user.id } },
  });
  let currentRank = null;
  let currentScore = 0;
  if (currentEntry) {
    currentScore = (currentEntry as Record<string, number>)[orderField];
    const higherCount = await prisma.classroomLeaderboard.count({
      where: {
        classroomId: params.id,
        [orderField]: { gt: currentScore },
      } as Record<string, unknown>,
    });
    currentRank = higherCount + 1;
  }

  return NextResponse.json({
    type,
    entries: formatted,
    currentUser: currentEntry
      ? { rank: currentRank, score: currentScore }
      : null,
  });
}
