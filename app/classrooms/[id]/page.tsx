'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Nav from '@/components/Nav';
import Leaderboard from '@/components/Leaderboard';
import { useAuth } from '@/lib/auth-context';
import { LeaderboardType } from '@/types/vocab';

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  avatar?: string | null;
  score: number;
};

const leaderboardOptions: Array<{ id: LeaderboardType; label: string }> = [
  { id: 'total_points', label: 'Total points' },
  { id: 'weekly_points', label: 'Weekly points' },
  { id: 'quiz_accuracy', label: 'Quiz accuracy' },
  { id: 'games_won', label: 'Games won' },
  { id: 'streak_days', label: 'Streak days' },
];

export default function ClassroomDetailPage() {
  const params = useParams();
  const { session } = useAuth();
  const classId = typeof params?.id === 'string' ? params.id : '';
  const [classroomName, setClassroomName] = useState('');
  const [classroomDescription, setClassroomDescription] = useState('');
  const [activeType, setActiveType] = useState<LeaderboardType>('total_points');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [currentUserScore, setCurrentUserScore] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    const loadClass = async () => {
      const response = await fetch(`/api/classrooms/${classId}`);
      if (!response.ok) {
        setError('Unable to load classroom.');
        return;
      }
      const data = await response.json();
      setClassroomName(data.classroom?.name || 'Classroom');
      setClassroomDescription(data.classroom?.description || '');
    };
    const loadSettings = async () => {
      const response = await fetch(`/api/classrooms/${classId}/settings`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.settings?.defaultLeaderboardType) {
        setActiveType(data.settings.defaultLeaderboardType);
      }
    };
    loadClass();
    loadSettings();
  }, [classId]);

  const fetchLeaderboard = async () => {
    if (!classId) return;
    setIsLoading(true);
    const response = await fetch(`/api/classrooms/${classId}/leaderboard?type=${activeType}`);
    if (!response.ok) {
      setError('Unable to load leaderboard.');
      setIsLoading(false);
      return;
    }
    const data = await response.json();
    setEntries(data.entries || []);
    setCurrentUserRank(data.currentUser?.rank ?? null);
    setCurrentUserScore(data.currentUser?.score ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    setPage(1);
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, activeType]);

  const topTen = useMemo(() => entries.slice(0, 10), [entries]);

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              {classroomName}
            </h1>
            {classroomDescription && (
              <p className="text-white/70 mt-2">{classroomDescription}</p>
            )}
          </div>

          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {leaderboardOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveType(option.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeType === option.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white/70'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-300 mb-4">{error}</p>}
          {isLoading ? (
            <p className="text-white/70">Loading leaderboard...</p>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Top 10</h2>
                <Leaderboard
                  entries={topTen}
                  currentUserId={session?.userId}
                  page={1}
                  pageSize={10}
                  onPageChange={() => null}
                />
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-3">Full Leaderboard</h2>
                <Leaderboard
                  entries={entries}
                  currentUserId={session?.userId}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                />
                {currentUserRank !== null && (
                  <p className="text-white/70 text-sm mt-4">
                    Your rank: <span className="text-white font-semibold">{currentUserRank}</span> · Score:{' '}
                    <span className="text-white font-semibold">{currentUserScore ?? 0}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
