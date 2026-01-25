import Nav from '@/components/Nav';

export default function RequestVocabPage() {
  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Request a Custom Deck
          </h1>
          <p className="text-white/70">
            Monetized deck requests have been removed. Teachers can create and publish custom decks directly from the dashboard.
          </p>
        </div>
      </main>
    </div>
  );
}
