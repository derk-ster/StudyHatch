'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';
import { updatePassword } from '@/lib/auth';
import { getSubscriptionInfo, isPremium } from '@/lib/storage';
import { usePWA } from '@/components/PWAProvider';
import { isSchoolModeEnabled } from '@/lib/school-mode';

export default function AccountPage() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { canInstall, isInstalled, promptInstall } = usePWA();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState(false);
  const [aiSubscription, setAiSubscription] = useState(getSubscriptionInfo());
  const schoolMode = isSchoolModeEnabled();

  useEffect(() => {
    if (session?.isGuest) {
      router.push('/');
    }
  }, [session, router]);

  useEffect(() => {
    setPremiumStatus(isPremium());
    setAiSubscription(getSubscriptionInfo());
  }, []);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!session || session.isGuest) {
      setError('Must be logged in to change password');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePassword(session.userId, oldPassword, newPassword);
      if (result.success) {
        setSuccess('Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    router.push('/logout');
  };

  if (session?.isGuest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            Account Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-6 text-white">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                <div className="px-4 py-2 bg-white/5 rounded-lg text-white">
                  {session?.email || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Username</label>
                <div className="px-4 py-2 bg-white/5 rounded-lg text-white">
                  {session?.username || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Role</label>
                <div className="px-4 py-2 bg-white/5 rounded-lg text-white capitalize">
                  {session?.role || 'student'}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-6 text-white">Subscriptions</h2>
            {schoolMode ? (
              <p className="text-white/70 text-sm">
                School Edition disables payments and subscriptions. All classroom features are included.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white/90 font-medium">Premium</p>
                    <p className="text-white/60 text-sm">
                      {premiumStatus ? 'Active' : 'Not active'}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${premiumStatus ? 'text-green-300' : 'text-white/40'}`}>
                    {premiumStatus ? 'Enabled' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white/90 font-medium">AI Chat Monthly</p>
                    <p className="text-white/60 text-sm">
                      {aiSubscription.isActive ? `Active • ${aiSubscription.daysRemaining} day${aiSubscription.daysRemaining !== 1 ? 's' : ''} left` : 'Not active'}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${aiSubscription.isActive ? 'text-green-300' : 'text-white/40'}`}>
                    {aiSubscription.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Resources */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-4 text-white">Resources</h2>
            <p className="text-white/70 mb-4">
              Explore learning paths, flashcards, and translation practice to level up quickly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" href="/spanish-flashcards">
                Spanish Flashcards
              </Link>
              <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" href="/translation-practice">
                Translation Practice
              </Link>
              <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" href="/language-learning">
                Language Learning
              </Link>
              <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" href="/public-decks">
                Public Decks
              </Link>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-4 text-white">Data & Privacy</h2>
            <p className="text-white/70 mb-4">
              Request deletion of your account data or student records associated with your classroom.
            </p>
            <a
              href="mailto:admin@studyhatch.org?subject=StudyHatch%20Data%20Deletion%20Request"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
            >
              Request Data Deletion
            </a>
          </div>

          {/* Install StudyHatch */}
          {!isInstalled && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
              <h2 className="text-2xl font-bold mb-2 text-white">Install StudyHatch</h2>
              <p className="text-white/70 mb-4">
                Install the app for offline study and faster launches.
              </p>
              <button
                onClick={promptInstall}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all text-sm font-semibold pulse-glow"
              >
                Install App
              </button>
              {!canInstall && (
                <p className="text-white/60 text-sm mt-3">
                  If the install prompt doesn&apos;t appear, use the browser menu to install.
                </p>
              )}
            </div>
          )}

          {/* Change Password */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-6 text-white">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-200 text-sm">
                  {success}
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Logout */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-6 text-white">Account Actions</h2>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all"
            >
              Log Out
            </button>
            <p className="text-center text-white/60 text-sm mt-4">
              Logging out will keep your data saved. You can log back in anytime.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
