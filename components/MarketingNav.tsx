import Link from 'next/link';
import Image from 'next/image';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function MarketingNav() {
  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={`${basePath}/WebsiteLogo.png`}
            alt="StudyHatch logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-md object-cover"
            priority
          />
          <span className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            StudyHatch
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm text-white/80">
          <Link className="rounded-md px-3 py-1 hover:bg-white/10" href="/spanish-flashcards">
            Spanish Flashcards
          </Link>
          <Link className="rounded-md px-3 py-1 hover:bg-white/10" href="/translation-practice">
            Translation Practice
          </Link>
          <Link className="rounded-md px-3 py-1 hover:bg-white/10" href="/language-learning">
            Language Learning
          </Link>
          <Link className="rounded-md px-3 py-1 hover:bg-white/10" href="/public-decks">
            Public Decks
          </Link>
          <Link className="rounded-md px-3 py-1 hover:bg-white/10" href="/games">
            Games
          </Link>
          <Link className="rounded-md bg-purple-600 px-3 py-1 text-white hover:bg-purple-500" href="/login">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
