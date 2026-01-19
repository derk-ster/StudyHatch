import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Spanish Flashcards',
  description: 'Build Spanish vocabulary faster with StudyHatch flashcards, quizzes, and games. Practice verbs, phrases, and everyday Spanish with spaced review.',
  keywords: [
    'spanish flashcards',
    'spanish vocabulary',
    'learn spanish words',
    'spanish verbs',
    'spaced repetition spanish',
    'study spanish',
  ],
};

export default function SpanishFlashcardsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-200">Spanish Flashcards</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Spanish flashcards that help you remember faster
          </h1>
          <p className="mt-4 text-lg text-white/80">
            StudyHatch helps you build Spanish vocabulary with customizable flashcards, practice games, and daily review. 
            Create your own decks or explore public sets for verbs, phrases, and everyday Spanish.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500" href="/login">
              Start Free Flashcards
            </Link>
            <Link className="rounded-lg border border-white/20 px-5 py-2 font-semibold text-white hover:bg-white/10" href="/public-decks">
              Browse Public Decks
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { title: 'Spaced review', text: 'Return to the right cards at the right time to lock in long-term recall.' },
            { title: 'Multiple study modes', text: 'Flip cards, write answers, match pairs, or quiz yourself.' },
            { title: 'Teacher-friendly', text: 'Create classroom decks and share targeted vocabulary lists.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-white/70">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">How StudyHatch Spanish flashcards work</h2>
          <ol className="mt-4 grid gap-4 text-white/80 md:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-black/20 p-4">1. Build a deck for verbs, phrases, or a unit.</li>
            <li className="rounded-2xl border border-white/10 bg-black/20 p-4">2. Practice with flashcards, quizzes, and writing prompts.</li>
            <li className="rounded-2xl border border-white/10 bg-black/20 p-4">3. Track progress and review weak words daily.</li>
          </ol>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Popular Spanish flashcard ideas</h2>
          <div className="mt-4 grid gap-3 text-white/80 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Spanish verbs and conjugations',
              'Travel phrases and directions',
              'Food, drinks, and restaurants',
              'Greetings, introductions, and small talk',
              'Classroom Spanish for students',
              'Medical Spanish basics',
              'Weather and seasons',
              'Numbers, time, and dates',
              'Common adjectives and descriptions',
            ].map((topic) => (
              <div key={topic} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                {topic}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Explore more practice modes</h2>
          <p className="mt-3 text-white/80">
            Mix flashcards with writing, matching, and quiz modes to boost recall.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/flashcards">Flashcards</Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/quiz">Quiz</Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/match">Match</Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/write">Write</Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/scramble">Scramble</Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">Spanish flashcards for faster recall</h2>
            <p className="mt-3 text-white/80">
              Use StudyHatch to practice what matters: the words you miss, the phrases you need, and the verbs you want to master.
            </p>
            <Link className="mt-4 inline-flex rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500" href="/create">
              Create a Spanish Deck
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">Pair flashcards with translation practice</h2>
            <p className="mt-3 text-white/80">
              Combine flashcards with sentence translation to build context and fluency.
            </p>
            <Link className="mt-4 inline-flex rounded-lg border border-white/20 px-5 py-2 font-semibold text-white hover:bg-white/10" href="/translation-practice">
              Explore Translation Practice
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
