'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';
import { ClassRoom } from '@/types/vocab';
import Link from 'next/link';

export default function ClassroomsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [teacherSchoolName, setTeacherSchoolName] = useState<string | null>(null);
  const [teacherClassesWithStudents, setTeacherClassesWithStudents] = useState<
    Array<ClassRoom & { students?: { userId: string; username: string }[] }>
  >([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!session?.userId || session.isGuest) return;
    const loadClasses = async () => {
      const response = await fetch('/api/classrooms');
      if (!response.ok) return;
      const data = await response.json();
      if (session.role === 'teacher') {
        setTeacherSchoolName(data.school?.name || null);
        setTeacherClassesWithStudents(data.classes || []);
      } else {
        setClasses(data.classes || []);
      }
    };
    loadClasses();
  }, [session?.userId, session?.role]);

  const handleJoinClass = () => {
    setJoinError('');
    const trimmed = joinCode.trim();
    if (!trimmed) {
      setJoinError('Enter a class code to join.');
      return;
    }
    router.push(`/join-class/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Classrooms
          </h1>
          <p className="text-white/70 mb-8">
            View the classes you are enrolled in.
          </p>

          {!session || session.isGuest ? (
            <p className="text-white/60">Log in to access classroom content.</p>
          ) : session.role === 'teacher' ? (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-white/80 text-sm mb-1">Your Classrooms</p>
                {teacherSchoolName && (
                  <p className="text-white/60 text-xs">School: {teacherSchoolName}</p>
                )}
              </div>
              {teacherClassesWithStudents.length === 0 ? (
                <p className="text-white/60">No classrooms created yet.</p>
              ) : (
                teacherClassesWithStudents.map(classroom => {
                  const students = classroom.students || [];
                  return (
                    <div key={classroom.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold">{classroom.name}</p>
                          {classroom.description && (
                            <p className="text-white/60 text-sm">{classroom.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-200/70 text-xs">Join code: {classroom.joinCode}</p>
                          <Link
                            href={`/create?classId=${classroom.id}`}
                            className="inline-flex mt-2 px-3 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-xs font-semibold transition-all"
                          >
                            + Create Deck
                          </Link>
                        </div>
                      </div>
                      <div>
                        <p className="text-white/70 text-sm mb-2">Students</p>
                        {students.length === 0 ? (
                          <p className="text-white/40 text-sm">No students enrolled yet.</p>
                        ) : (
                          <ul className="text-white/70 text-sm space-y-1">
                            {students.map(student => (
                              <li key={student.userId}>@{student.username}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-white/80 text-sm mb-3">Join a classroom</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter class code"
                  />
                  <button
                    onClick={handleJoinClass}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all text-sm font-semibold"
                  >
                    Join Class
                  </button>
                </div>
                {joinError && (
                  <p className="text-red-300 text-xs mt-2">{joinError}</p>
                )}
              </div>
              {classes.length === 0 ? (
                <p className="text-white/60">No classes joined yet.</p>
              ) : (
                classes.map(classroom => (
                  <div key={classroom.id} className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{classroom.name}</p>
                        {classroom.description && (
                          <p className="text-white/60 text-sm">{classroom.description}</p>
                        )}
                        <p className="text-emerald-200/70 text-xs mt-2">Join code: {classroom.joinCode}</p>
                      </div>
                      <Link
                        href={`/classrooms/${classroom.id}`}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                      >
                        View Leaderboard
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
