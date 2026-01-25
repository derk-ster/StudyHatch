'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { isSchoolModeEnabled } from '@/lib/school-mode';

const DISMISSED_KEY = 'studyhatch-compliance-banner-dismissed';

export default function ComplianceBanner() {
  const { session } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!isSchoolModeEnabled()) {
      setDismissed(true);
      return;
    }
    if (!session || session.isGuest) {
      setDismissed(true);
      return;
    }
    const stored = localStorage.getItem(DISMISSED_KEY);
    setDismissed(stored === 'true');
  }, [session]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-emerald-600/20 border-b border-emerald-400/40 px-4 py-3 text-sm text-emerald-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          StudyHatch School Edition complies with FERPA and COPPA. No student data is sold. Teachers control AI and multiplayer features.
        </span>
        <button
          onClick={handleDismiss}
          className="self-start rounded-lg bg-emerald-500/40 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500/60 sm:self-auto"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
