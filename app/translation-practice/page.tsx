import type { Metadata } from 'next';
import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Translation Practice',
  description: 'Practice translations with StudyHatch. Build sentence-level fluency with writing, quizzes, and custom vocabulary decks.',
  keywords: [
    'translation practice',
    'english to spanish translation',
    'spanish translation practice',
    'language translation exercises',
    'sentence translation practice',
  ],
};

export default function TranslationPracticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-200">Translation Practice</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            Translation practice that builds real-world fluency
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Go beyond isolated words. StudyHatch gives you translation exercises that combine vocabulary, grammar, and context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500" href="/login">
              Start Translating
            </Link>
            <Link className="rounded-lg border border-white/20 px-5 py-2 font-semibold text-white hover:bg-white/10" href="/request-vocab">
              Request Vocabulary
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { title: 'Sentence practice', text: 'Translate phrases you actually use in school, travel, or work.' },
            { title: 'Active recall', text: 'Write answers to strengthen speaking and comprehension skills.' },
            { title: 'Track mastery', text: 'See which phrases need review and which ones you know cold.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-white/70">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Translation practice paths</h2>
          <div className="mt-4 grid gap-3 text-white/80 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'English to Spanish translation practice',
              'Spanish to English translation practice',
              'Travel and tourism phrases',
              'Restaurant and ordering language',
              'Medical and emergency basics',
              'Classroom and school phrases',
              'Business and workplace communication',
              'Everyday conversation starters',
              'Grammar-focused translations',
            ].map((topic) => (
              <div key={topic} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                {topic}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Combine translation practice with flashcards</h2>
          <p className="mt-3 text-white/80">
            Build a deck of target vocabulary, then reinforce it with translation drills and writing modes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/spanish-flashcards">
              Spanish Flashcards
            </Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/language-learning">
              Language Learning Guide
            </Link>
            <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/write">
              Write Mode
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">Translation practice for any language</h2>
            <p className="mt-3 text-white/80">
              StudyHatch decks work across Spanish, Chinese, French, and more. Customize your translations to your course or goals.
            </p>
            <Link className="mt-4 inline-flex rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white hover:bg-purple-500" href="/create">
              Create a Deck
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold">Need ready-made vocabulary?</h2>
            <p className="mt-3 text-white/80">
              Browse public decks or request vocabulary sets to match your class, unit, or exam.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/public-decks">
                Public Decks
              </Link>
              <Link className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10" href="/request-vocab">
                Request Vocab
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
