'use client';

import Nav from '@/components/Nav';
import { ReactNode } from 'react';

type GameShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function GameShell({ title, subtitle, children }: GameShellProps) {
  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-6 sm:p-10">
          <div className="mb-6">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              {title}
            </h1>
            {subtitle && <p className="text-white/70 mt-2 text-lg">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
