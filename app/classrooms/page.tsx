'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';
import { ClassRoom } from '@/types/vocab';
import { getClassesForStudent } from '@/lib/storage';
import Link from 'next/link';

export default function ClassroomsPage() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);

  useEffect(() => {
    if (session?.role === 'student' && session.userId) {
      setClasses(getClassesForStudent(session.userId));
    }
  }, [session?.userId, session?.role]);

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
            <p className="text-white/60">Teacher tools are available in the Teacher Dashboard.</p>
          ) : (
            <div className="space-y-4">
              {classes.length === 0 ? (
                <p className="text-white/60">No classes joined yet.</p>
              ) : (
                classes.map(classroom => (
                  <div key={classroom.id} className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4">
                    <p className="text-white font-semibold">{classroom.name}</p>
                    {classroom.description && (
                      <p className="text-white/60 text-sm">{classroom.description}</p>
                    )}
                    <p className="text-emerald-200/70 text-xs mt-2">Join code: {classroom.joinCode}</p>
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
