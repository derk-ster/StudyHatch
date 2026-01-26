'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';
import { getAllUsers } from '@/lib/auth';
import { getClassesForStudent, getClassesForSchool, getSchoolForUser, getStudentsForClass } from '@/lib/storage';
import { getWeekRangeLabel, getWeeklyStatsSnapshot, WeeklyUserStats } from '@/lib/leaderboards';

type Scope = 'public' | 'classroom';

type LeaderboardRow = {
  userId: string;
  username: string;
  activities: number;
  accuracyRate: number;
  accuracyTotal: number;
  isCurrentUser: boolean;
};

const formatAccuracy = (value: number): string => `${Math.round(value)}%`;

const buildRoster = (
  stats: Record<string, WeeklyUserStats>,
  roster: { userId: string; username: string }[],
  currentUserId?: string
): LeaderboardRow[] => {
  return roster.map((user) => {
    const userStats = stats[user.userId] || {
      username: user.username,
      activities: 0,
      accuracyCorrect: 0,
      accuracyTotal: 0,
    };
    const accuracyRate = userStats.accuracyTotal > 0
      ? (userStats.accuracyCorrect / userStats.accuracyTotal) * 100
      : 0;
    return {
      userId: user.userId,
      username: user.username || userStats.username,
      activities: userStats.activities,
      accuracyRate,
      accuracyTotal: userStats.accuracyTotal,
      isCurrentUser: currentUserId === user.userId,
    };
  });
};

const LeaderboardCard = ({
  title,
  description,
  rows,
  valueLabel,
  valueFormatter,
}: {
  title: string;
  description: string;
  rows: LeaderboardRow[];
  valueLabel: string;
  valueFormatter: (row: LeaderboardRow) => string;
}) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="text-white/80 text-lg font-semibold">{title}</div>
        <p className="mt-2 text-white/60 text-sm">{description}</p>
        <div className="mt-6 text-white/50 text-sm">
          No results yet. Complete an activity to claim the first spot.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="text-white/80 text-lg font-semibold">{title}</div>
      <p className="mt-2 text-white/60 text-sm">{description}</p>
      <div className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <div
            key={`${row.userId}-${title}`}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              index === 0 ? 'bg-purple-500/20 text-purple-100' : 'bg-white/5 text-white/90'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold w-6 text-right">{index + 1}</span>
              <span className="font-semibold">
                {row.username}
                {row.isCurrentUser ? ' (you)' : ''}
              </span>
            </div>
            <div className="text-sm text-white/70">
              {valueLabel}: <strong className="text-white">{valueFormatter(row)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LeaderboardsPage() {
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = (searchParams.get('scope') === 'classroom' ? 'classroom' : 'public') as Scope;

  const weekRange = getWeekRangeLabel();
  const weeklyStats = getWeeklyStatsSnapshot();

  const globalRoster = useMemo(() => {
    const users = getAllUsers().map(entry => ({
      userId: entry.user.id,
      username: entry.user.username,
    }));
    if (session?.isGuest || (session?.userId && !users.some(user => user.userId === session.userId))) {
      users.push({
        userId: session?.userId || 'guest',
        username: session?.username || 'Guest',
      });
    }
    return users;
  }, [session?.userId, session?.username, session?.isGuest]);

  const classroomOptions = useMemo(() => {
    if (!session?.userId || session.role === 'guest') return [];
    if (session.role === 'teacher') {
      const school = getSchoolForUser(session.userId);
      return school ? getClassesForSchool(school.id) : [];
    }
    return getClassesForStudent(session.userId);
  }, [session?.userId, session?.role]);

  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    const nextClassId = searchParams.get('classId') || classroomOptions[0]?.id || '';
    setSelectedClassId(nextClassId);
  }, [searchParams, classroomOptions]);
  const classRoster = selectedClassId ? getStudentsForClass(selectedClassId) : [];

  const roster = scope === 'classroom' ? classRoster : globalRoster;
  const stats = scope === 'classroom'
    ? (weeklyStats.classUsers[selectedClassId] || {})
    : weeklyStats.users;

  const rows = buildRoster(stats, roster, session?.userId);

  const getRowsForMetric = (metric: 'momentum' | 'activities' | 'accuracy') => {
    const filtered = rows.filter(row => {
      if (metric === 'accuracy') return row.accuracyTotal > 0 || row.isCurrentUser;
      return row.activities > 0 || row.isCurrentUser;
    });

    const sorted = filtered.sort((a, b) => {
      if (metric === 'accuracy') {
        if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
        return b.accuracyTotal - a.accuracyTotal;
      }
      if (metric === 'momentum') {
        const scoreA = a.activities + Math.round(a.accuracyRate);
        const scoreB = b.activities + Math.round(b.accuracyRate);
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      return b.activities - a.activities;
    });

    return sorted.slice(0, 10);
  };

  const momentumRows = getRowsForMetric('momentum');
  const activityRows = getRowsForMetric('activities');
  const accuracyRows = getRowsForMetric('accuracy');

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Weekly Leaderboards
          </h1>
          <p className="text-white/70 text-lg">
            Fresh rankings every week ({weekRange.start} - {weekRange.end}).
          </p>
          <div className="mt-4 inline-flex flex-col sm:flex-row gap-3 items-center justify-center text-sm text-white/80 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <span className="font-semibold text-white">Streak Skip Reward</span>
            <span>Top 10 earn 1 Streak Skip Day. #1 earns 3.</span>
            <span className="text-white/60">
              Streak Skip Day: keep your streak alive on a day you miss.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Link
            href="/leaderboards?scope=public"
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              scope === 'public'
                ? 'bg-purple-500/20 border-purple-400/50 text-purple-100'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            Public Leaderboards
          </Link>
          <Link
            href="/leaderboards?scope=classroom"
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              scope === 'classroom'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            Classroom Leaderboards
          </Link>
        </div>

        {scope === 'classroom' && (
          <div className="mb-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <label className="text-white/80 text-sm">Choose a class</label>
            <select
              value={selectedClassId}
              onChange={(event) => {
                const classId = event.target.value;
                setSelectedClassId(classId);
                const params = new URLSearchParams(searchParams.toString());
                params.set('scope', 'classroom');
                params.set('classId', classId);
                router.replace(`${pathname}?${params.toString()}`);
              }}
              className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {classroomOptions.map((classroom) => (
                <option key={classroom.id} value={classroom.id} className="bg-gray-800">
                  {classroom.name || classroom.joinCode}
                </option>
              ))}
            </select>
            {classroomOptions.length === 0 && (
              <p className="text-white/60 text-sm">Join a class to unlock classroom rankings.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LeaderboardCard
            title="Momentum Champions"
            description="A blend of consistency and accuracy over the week."
            rows={momentumRows}
            valueLabel="Score"
            valueFormatter={(row) => `${row.activities + Math.round(row.accuracyRate)}`}
          />
          <LeaderboardCard
            title="Most Activities Completed"
            description="Every study action counts toward the leaderboard."
            rows={activityRows}
            valueLabel="Actions"
            valueFormatter={(row) => `${row.activities}`}
          />
          <LeaderboardCard
            title="Highest Accuracy"
            description="Precision leaders with the sharpest answers."
            rows={accuracyRows}
            valueLabel="Accuracy"
            valueFormatter={(row) => `${formatAccuracy(row.accuracyRate)}`}
          />
        </div>
      </main>
    </div>
  );
}
