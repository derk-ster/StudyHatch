import Link from 'next/link';
import Nav from '@/components/Nav';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
          404
        </h1>
        <p className="text-xl text-white/80 mb-6">This page could not be found.</p>
        <p className="text-white/60 text-sm mb-8 max-w-md">
          The link may be broken, or you may have typed the URL incorrectly. Try going to the homepage.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
        >
          Go to homepage
        </Link>
      </main>
    </div>
  );
}
