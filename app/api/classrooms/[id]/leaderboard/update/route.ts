import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-server';
import { getRateLimitKey, rateLimit } from '@/lib/rate-limit';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateKey = getRateLimitKey(user.id, request.headers.get('x-forwarded-for'));
  const rate = rateLimit(`leaderboard-update:${params.id}:${rateKey}`, 120, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
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

  const body = await request.json();
  const pointsValue = Number(body.points || 0);
  const points = Number.isFinite(pointsValue) ? pointsValue : 0;
  const quizResult = body.quizResult as { correct?: boolean } | undefined;
  const gameWin = Boolean(body.gameWin);
  const streakDays = body.streakDays as number | undefined;
  const streakIncrement = Number(body.streakIncrement || 0);

  const existing = await prisma.classroomLeaderboard.findUnique({
    where: { classroomId_userId: { classroomId: params.id, userId: user.id } },
  });
  const resetNeeded = !existing || Date.now() - existing.lastWeekResetAt.getTime() >= WEEK_MS;
  const weeklyPoints = (resetNeeded ? 0 : existing.weeklyPoints) + Math.max(0, points);

  const nextQuizAttempts = (existing?.quizAttempts || 0) + (quizResult ? 1 : 0);
  const nextQuizCorrect = (existing?.quizCorrect || 0) + (quizResult?.correct ? 1 : 0);
  const nextQuizAccuracy = nextQuizAttempts > 0
    ? Math.round((nextQuizCorrect / nextQuizAttempts) * 100)
    : 0;

  const resolvedStreakDays = typeof streakDays === 'number'
    ? streakDays
    : (existing?.streakDays || 0) + Math.max(0, streakIncrement);

  const updated = await prisma.classroomLeaderboard.upsert({
    where: { classroomId_userId: { classroomId: params.id, userId: user.id } },
    create: {
      classroomId: params.id,
      userId: user.id,
      totalPoints: Math.max(0, points),
      weeklyPoints,
      quizAttempts: nextQuizAttempts,
      quizCorrect: nextQuizCorrect,
      quizAccuracy: nextQuizAccuracy,
      gamesWon: gameWin ? 1 : 0,
      streakDays: resolvedStreakDays,
      lastWeekResetAt: resetNeeded ? new Date() : (existing?.lastWeekResetAt ?? new Date()),
    },
    update: {
      totalPoints: (existing?.totalPoints || 0) + Math.max(0, points),
      weeklyPoints,
      quizAttempts: nextQuizAttempts,
      quizCorrect: nextQuizCorrect,
      quizAccuracy: nextQuizAccuracy,
      gamesWon: (existing?.gamesWon || 0) + (gameWin ? 1 : 0),
      streakDays: resolvedStreakDays,
      lastWeekResetAt: resetNeeded ? new Date() : existing?.lastWeekResetAt,
    },
  });

  return NextResponse.json({ leaderboard: updated });
}
