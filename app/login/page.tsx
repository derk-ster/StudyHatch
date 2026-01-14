'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, continueAsGuest, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = await signIn(email, password);
        if (result.success) {
          router.push('/');
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        const result = await signUp(email, username, password);
        if (result.success) {
          router.push('/');
        } else {
          setError(result.error || 'Sign up failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            StudyHatch
          </h1>
          <p className="text-white/70">Learn vocabulary the fun way</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20 card-glow">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                isLogin
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                !isLogin
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Choose a username"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                {isLogin ? 'Email or Username' : 'Email'}
              </label>
              <input
                type={isLogin ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={isLogin ? 'email@example.com or username' : 'your@email.com'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Please wait...' : isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/20">
            <button
              onClick={handleContinueAsGuest}
              className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all"
            >
              Continue as Guest
            </button>
            <p className="text-center text-white/60 text-sm mt-3">
              Guest mode uses local storage. Create an account to sync across devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
