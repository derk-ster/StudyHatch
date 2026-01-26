'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';

export default function JoinSchoolPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const code = typeof params?.code === 'string' ? params.code : '';

  useEffect(() => {
    if (!code) return;
    if (!session || session.isGuest) {
      setError('Please log in as a teacher to join a school.');
      return;
    }
    if (session.role !== 'teacher') {
      setError('Only teacher accounts can join a school.');
      return;
    }
    const joinSchool = async () => {
      try {
        const response = await fetch('/api/schools/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || 'Unable to join school.');
          return;
        }
        const data = await response.json();
        setMessage(`Joined ${data.school?.name || 'school'} successfully.`);
        setTimeout(() => router.push('/teacher-dashboard'), 1200);
      } catch (err) {
        setError('Unable to join school.');
      }
    };
    joinSchool();
  }, [code, session, router]);

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Join School</h1>
          {message && <p className="text-green-300">{message}</p>}
          {error && <p className="text-red-400">{error}</p>}
          {!message && !error && <p className="text-white/70">Processing invite...</p>}
        </div>
      </main>
    </div>
  );
}
