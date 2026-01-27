import Nav from '@/components/Nav';

export const metadata = {
  title: 'Privacy Policy',
  description: 'StudyHatch School Edition privacy policy for K-12 compliance.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-12 text-white/90">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            Privacy Policy
          </h1>
          <p className="text-white/70 mb-8">Effective date: January 25, 2026</p>

          <section className="space-y-4 text-sm leading-relaxed text-white/80">
            <p>
              StudyHatch School Edition is designed for K-12 classrooms and complies with the Family Educational Rights and Privacy Act (FERPA)
              and the Children&apos;s Online Privacy Protection Act (COPPA). We collect only the minimum data needed to provide educational services.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">What We Collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Account information (teacher or student name, email, role).</li>
              <li>Classroom and deck activity (decks created, study progress, quiz scores).</li>
              <li>AI tutor usage metrics (messages sent, timestamps).</li>
              <li>Device and usage data required for essential analytics and reliability.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-6">How We Use Data</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide core learning features (flashcards, quizzes, study progress).</li>
              <li>Support teacher controls and classroom management.</li>
              <li>Improve platform reliability and performance.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-6">Data Sharing</h2>
            <p>
              We do not sell student or teacher data. We do not serve ads. We do not use third-party tracking beyond essential analytics
              needed to keep the platform stable and secure.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">Data Retention</h2>
            <p>
              We store data only for educational functionality and account management. Schools can request data removal at any time.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">COPPA & FERPA Commitments</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>School Edition is for educational use under school authority.</li>
              <li>Parents and teachers may review or request deletion of student data.</li>
              <li>We limit access to student data to authorized users and classroom settings.</li>
            </ul>

            <h2 className="text-xl font-semibold text-white mt-6">Request Data Deletion</h2>
            <p>
              Parents, guardians, and teachers can request student data deletion at any time by contacting us at
              <a className="ml-1 text-purple-300 hover:text-purple-200" href="mailto:derek.ray.2104@gmail.com">
                derek.ray.2104@gmail.com
              </a>.
            </p>

            <h2 className="text-xl font-semibold text-white mt-6">Contact</h2>
            <p>
              For questions about this policy, email
              <a className="ml-1 text-purple-300 hover:text-purple-200" href="mailto:derek.ray.2104@gmail.com">
                derek.ray.2104@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
