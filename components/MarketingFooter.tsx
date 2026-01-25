import Link from 'next/link';
import { isSchoolModeEnabled } from '@/lib/school-mode';

export default function MarketingFooter() {
  const schoolMode = isSchoolModeEnabled();
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>StudyHatch helps learners build vocabulary with flashcards, quizzes, and translation practice.</div>
        <div className="flex flex-wrap items-center gap-3">
          <Link className="hover:text-white" href="/spanish-flashcards">Spanish Flashcards</Link>
          <Link className="hover:text-white" href="/translation-practice">Translation Practice</Link>
          <Link className="hover:text-white" href="/language-learning">Language Learning</Link>
          {!schoolMode && <Link className="hover:text-white" href="/pricing">Pricing</Link>}
          <Link className="hover:text-white" href="/privacy">Privacy</Link>
          <Link className="hover:text-white" href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
