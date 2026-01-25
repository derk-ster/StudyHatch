import Nav from '@/components/Nav';

export const metadata = {
  title: 'Terms of Service',
  description: 'StudyHatch School Edition terms of service for K-12 use.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-12 text-white/90">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Terms of Service
          </h1>
          <p className="text-white/70 mb-8">Effective date: January 25, 2026</p>

          <section className="space-y-4 text-sm leading-relaxed text-white/80">
            <p>
              These Terms of Service govern use of StudyHatch School Edition. By using the platform, you agree to comply with these terms.
              If you are a student, your school or guardian provides consent on your behalf.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">Educational Purpose</h2>
            <p>
              StudyHatch is a learning platform for classroom use. Data is collected only to deliver educational functionality, progress
              tracking, and classroom management.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">Privacy Commitments</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>No student data is sold.</li>
              <li>No advertising is shown in School Edition.</li>
              <li>No third-party tracking beyond essential analytics.</li>
              <li>Parents and teachers may request deletion of student data.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-6">Teacher Controls</h2>
            <p>
              Teachers can enable or disable AI tutor access, student deck creation, and multiplayer games per class. Teachers are
              responsible for supervising student use.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">AI Tutor Usage</h2>
            <p>
              When enabled by a teacher, the AI tutor provides hints only and does not give direct answers. The AI tutor is not a replacement
              for teacher instruction.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">Acceptable Use</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Do not attempt to access other users&apos; data or credentials.</li>
              <li>Do not submit harmful, illegal, or abusive content.</li>
              <li>Respect classroom rules and teacher guidance.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-6">Account Responsibility</h2>
            <p>
              Teachers and students are responsible for maintaining the confidentiality of their login credentials. Report suspected issues
              to <a className="text-purple-300 hover:text-purple-200" href="mailto:admin@studyhatch.org">admin@studyhatch.org</a>.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">Contact</h2>
            <p>
              Questions about these terms can be sent to
              <a className="ml-1 text-purple-300 hover:text-purple-200" href="mailto:admin@studyhatch.org">
                admin@studyhatch.org
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
