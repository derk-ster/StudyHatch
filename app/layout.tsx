import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import PWAProvider from '@/components/PWAProvider';

export const metadata: Metadata = {
  title: 'StudyHatch',
  description: 'Create and study custom vocabulary decks with interactive flashcards and games',
  applicationName: 'StudyHatch',
  manifest: '/manifest.json',
  themeColor: '#1e1b4b',
  appleWebApp: {
    capable: true,
    title: 'StudyHatch',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
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
