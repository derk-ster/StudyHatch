import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Language Learning',
  description: 'StudyHatch helps you learn languages with flashcards, quizzes, translation practice, and progress tracking built for students and teachers.',
  keywords: [
    'language learning',
    'learn languages online',
    'vocabulary practice',
    'flashcards for language learning',
    'translation exercises',
  ],
};

export default function LanguageLearningPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-200">Language Learning</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            A focused language learning workflow for students and teachers
          </h1>
          <p className="mt-4 text-lg text-white/80">
            StudyHatch combines flashcards, quizzes, and writing practice so learners can grow vocabulary, build fluency, and track progress.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500" href="/login">
              Start Learning
            </Link>
            <Link className="rounded-lg border border-white/20 px-5 py-2 font-semibold text-white hover:bg-white/10" href="/pricing">
              View Plans
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { title: 'Vocabulary mastery', text: 'Build decks that match your class or goals, then review on a schedule.' },
            { title: 'Active practice', text: 'Use writing, matching, and quizzes to turn memory into fluency.' },
            { title: 'Teacher-ready', text: 'Share decks, track progress, and keep learners aligned.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-white/70">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">What you can practice</h2>
          <div className="mt-4 grid gap-3 text-white/80 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Spanish, Chinese, French, and more',
              'Everyday conversation',
              'Grammar and verb tenses',
              'Academic and classroom vocabulary',
              'Travel and business communication',
              'Writing and translation practice',
              'Listening and recall drills',
              'Exam prep vocabulary',
              'Industry-specific language',
            ].map((topic) => (
              <div key={topic} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                {topic}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Recommended paths</h2>
          <p className="mt-3 text-white/80">
            Pick a path and build a routine around it. Mix vocabulary study with translation and speaking practice.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/spanish-flashcards">
              Spanish Flashcards
            </Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/translation-practice">
              Translation Practice
            </Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/public-decks">
              Public Decks
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">Teacher tools included</h2>
            <p className="mt-3 text-white/80">
              Teachers can build classroom decks, publish content, and guide students through targeted practice.
            </p>
            <Link className="mt-4 inline-flex rounded-lg border border-white/20 px-5 py-2 font-semibold text-white hover:bg-white/10" href="/teacher-dashboard">
              Teacher Dashboard
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">Ready to build a study plan?</h2>
            <p className="mt-3 text-white/80">
              Start with a deck of 20-50 words, review daily, and add translation practice for fluency.
            </p>
            <Link className="mt-4 inline-flex rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500" href="/create">
              Create a Deck
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
