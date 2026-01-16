'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleConfirm = () => {
    signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Log Out</h1>
          <p className="text-white/70 mb-8">Are you sure you want to log out?</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-all font-medium"
            >
              Log Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
