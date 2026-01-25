import Nav from '@/components/Nav';
import { notFound } from 'next/navigation';
import { RESOURCES } from '@/app/resources/resources';

export default function ResourceDetailPage({ params }: { params: { slug: string } }) {
  const resource = RESOURCES.find(entry => entry.id === params.slug);

  if (!resource) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <section className="bg-white/5 rounded-2xl border border-white/10 p-8 text-white/90">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-4">
            {resource.title}
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-8">{resource.overview}</p>

          <div className="space-y-6">
            {resource.sections.map(section => (
              <div key={section.heading}>
                <h2 className="text-2xl font-semibold mb-2 text-white">{section.heading}</h2>
                <p className="text-white/70 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <h3 className="text-xl font-semibold text-white mb-3">Key Takeaways</h3>
            <ul className="space-y-2 text-white/70">
              {resource.keyPoints.map(point => (
                <li key={point} className="flex gap-2">
                  <span className="text-purple-300">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
