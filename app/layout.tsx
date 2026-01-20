import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import PWAProvider from '@/components/PWAProvider';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  verification: {
    google: 'JxRzKnTZwV5Ubn-fIVS3NasIAAcdzRV__KZOo0caKfk',
  },
  title: {
    default: 'StudyHatch | Language Learning Flashcards',
    template: '%s | StudyHatch',
  },
  description: 'StudyHatch helps students and teachers build vocabulary with flashcards, quizzes, and translation practice.',
  applicationName: 'StudyHatch',
  keywords: [
    'language learning',
    'flashcards',
    'vocabulary practice',
    'translation practice',
    'spanish flashcards',
    'study tools',
  ],
  manifest: `${basePath}/manifest.json`,
  themeColor: '#1e1b4b',
  appleWebApp: {
    capable: true,
    title: 'StudyHatch',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: `${basePath}/icon.png`, type: 'image/png' },
    ],
    shortcut: `${basePath}/icon.png`,
    apple: `${basePath}/icon.png`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <PWAProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
