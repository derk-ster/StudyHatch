'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { useAuth } from '@/lib/auth-context';
import { deleteAccount, updatePassword } from '@/lib/auth';
import { usePWA } from '@/components/PWAProvider';
import { isSchoolModeEnabled } from '@/lib/school-mode';
import { useAudioSettings } from '@/lib/audio-settings';
import { playSfx } from '@/lib/sfx';
import { getXPInfo } from '@/lib/xp';

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
  const [showDeletionWarning, setShowDeletionWarning] = useState(false);
  const schoolMode = isSchoolModeEnabled();
  const { settings, updateSettings } = useAudioSettings();
  const { xp, level, xpForNextLevel, xpToday, progressToNext } = getXPInfo();
  const [xpDisplay, setXpDisplay] = useState(0);
  const [xpTodayDisplay, setXpTodayDisplay] = useState(0);
  const [xpNextDisplay, setXpNextDisplay] = useState(0);
  const [xpProgressDisplay, setXpProgressDisplay] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (session?.isGuest) {
      router.push('/');
    }
  }, [session, router]);

  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const start = performance.now();
    const duration = 900;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setXpDisplay(Math.round(xp * eased));
      setXpTodayDisplay(Math.round(xpToday * eased));
      setXpNextDisplay(Math.round(xpForNextLevel * eased));
      setXpProgressDisplay(progressToNext * eased);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [xp, xpToday, xpForNextLevel, progressToNext]);

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

  const handleRequestDeletion = () => {
    setShowDeletionWarning(true);
  };

  const handleConfirmDeletion = () => {
    if (!session?.userId) {
      setShowDeletionWarning(false);
      return;
    }
    const result = deleteAccount(session.userId);
    setShowDeletionWarning(false);
    if (!result.success) {
      setError(result.error || 'Unable to delete account.');
      return;
    }
    signOut();
    router.push('/login');
  };

  const renderVolumeRow = (
    label: string,
    description: string,
    value: number,
    muted: boolean,
    onMutedChange: (next: boolean) => void,
    onVolumeChange: (next: number) => void,
    onTest?: () => void
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-medium">{label}</div>
          <div className="text-xs text-white/60">{description}</div>
        </div>
        <div className="flex items-center gap-4">
          {onTest && (
            <button
              type="button"
              onClick={onTest}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              Test
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => onMutedChange(e.target.checked)}
              className="h-4 w-4"
            />
            Mute
          </label>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(value * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="w-full accent-purple-500"
        />
        <div className="w-12 text-right text-sm text-white/70">
          {Math.round(value * 100)}%
        </div>
      </div>
    </div>
  );

  if (session?.isGuest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12" data-reveal>
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

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-6 text-white">XP & Level</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-white/60 mb-1">Current Level</div>
                <div className="text-3xl font-bold text-purple-400">{level}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-white/60 mb-1">XP Gained Today</div>
                <div className="text-3xl font-bold text-blue-400">{xpTodayDisplay}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-white/60 mb-1">XP Gained Forever</div>
                <div className="text-3xl font-bold text-green-400">{xpDisplay}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-white/60 mb-1">XP to Next Level</div>
                <div className="text-3xl font-bold text-yellow-400">{xpNextDisplay}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 md:col-span-2">
                <div className="text-sm text-white/60 mb-2">Progress to Next Level</div>
                <div className="w-full bg-white/10 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                    style={{ width: `${Math.min(100, xpProgressDisplay * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* School Edition */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-4 text-white">School Edition</h2>
            <p className="text-white/70 text-sm">
              {schoolMode
                ? 'Teachers control AI and multiplayer access for classroom sessions.'
                : 'Teachers control AI and multiplayer access for classroom sessions.'}
            </p>
          </div>

          {/* Audio Settings */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-6 text-white">Audio Settings</h2>
            <div className="space-y-6">
              {renderVolumeRow(
                'Home Background Music',
                'Controls music on non-game pages.',
                settings.homeMusic.volume,
                settings.homeMusic.muted,
                (muted) => updateSettings({ homeMusic: { muted } }),
                (volume) => updateSettings({ homeMusic: { volume } })
              )}
              {renderVolumeRow(
                'In-Game Background Music',
                'Controls music during multiplayer games.',
                settings.gameMusic.volume,
                settings.gameMusic.muted,
                (muted) => updateSettings({ gameMusic: { muted } }),
                (volume) => updateSettings({ gameMusic: { volume } })
              )}
              {renderVolumeRow(
                'Correct Answer Sound',
                'Plays when answers are correct.',
                settings.correctSfx.volume,
                settings.correctSfx.muted,
                (muted) => updateSettings({ correctSfx: { muted } }),
                (volume) => updateSettings({ correctSfx: { volume } }),
                () => playSfx('correct')
              )}
              {renderVolumeRow(
                'Incorrect Answer Sound',
                'Plays when answers are incorrect.',
                settings.incorrectSfx.volume,
                settings.incorrectSfx.muted,
                (muted) => updateSettings({ incorrectSfx: { muted } }),
                (volume) => updateSettings({ incorrectSfx: { volume } }),
                () => playSfx('incorrect')
              )}
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-4 text-white">Resources</h2>
            <p className="text-white/70 mb-4">
              Access the StudyHatch resource library from the top navigation bar.
            </p>
            <Link
              href="/resources/getting-started"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium"
            >
              View Resources
            </Link>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
            <h2 className="text-2xl font-bold mb-4 text-white">Data & Privacy</h2>
            <p className="text-white/70 mb-4">
              Request deletion of your account data or student records associated with your classroom.
            </p>
            <button
              type="button"
              onClick={handleRequestDeletion}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-all"
            >
              Request Data Deletion
            </button>
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
      {showDeletionWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-gray-900 p-6 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-3">Confirm Data Deletion</h3>
            <p className="text-white/70 mb-4">
              Deleting your data will permanently remove:
            </p>
            <ul className="list-disc pl-6 text-white/70 space-y-1 mb-6">
              <li>Your account profile and login access</li>
              <li>Decks, progress, and study history</li>
              <li>Classroom membership data and activity logs</li>
            </ul>
            <p className="text-white/60 text-sm mb-6">
              This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleConfirmDeletion}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all"
              >
                Confirm & Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeletionWarning(false)}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
