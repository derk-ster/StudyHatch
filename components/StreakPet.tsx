'use client';

import { useState, useEffect } from 'react';
import { getStreakInfo, getProgressToNextEvolution, getNextEvolutionStreak } from '@/lib/streak';
import { PetStage } from '@/types/vocab';

type PetProps = {
  streak: number;
  petStage: PetStage;
  progressToNext: number;
  showDetails?: boolean;
};

// Pet emoji/visual representation
const PET_EMOJIS: Record<PetStage, string> = {
  egg: '🥚',
  baby: '🐣',
  child: '🐥',
  evolved: '🐉',
};

const PET_COLORS: Record<PetStage, string> = {
  egg: 'bg-gray-400',
  baby: 'bg-yellow-400',
  child: 'bg-orange-400',
  evolved: 'bg-purple-500',
};

export function PetDisplay({ streak, petStage, progressToNext, showDetails = false }: PetProps) {
  const emoji = PET_EMOJIS[petStage];
  const color = PET_COLORS[petStage];
  
  return (
    <div className="flex flex-col items-center">
      <div className={`text-8xl mb-4 transform transition-transform hover:scale-110 ${streak === 0 ? 'opacity-50 grayscale' : ''}`}>
        {emoji}
      </div>
      {showDetails && (
        <div className="text-center w-full max-w-xs">
          <div className="text-2xl font-bold text-white mb-2">
            {streak} Day{streak !== 1 ? 's' : ''} Streak
          </div>
          <div className="text-white/70 text-sm mb-2">
            {petStage.charAt(0).toUpperCase() + petStage.slice(1)} Stage
          </div>
          {progressToNext < 1 && (
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${color}`}
                style={{ width: `${progressToNext * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StreakPetWidget() {
  const [streakInfo, setStreakInfo] = useState(getStreakInfo());
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Refresh streak info periodically
    const interval = setInterval(() => {
      setStreakInfo(getStreakInfo());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
      >
        <span className="text-3xl">{PET_EMOJIS[streakInfo.petStage]}</span>
        <div className="text-left">
          <div className="text-sm font-medium text-white">
            {streakInfo.streak} Day{streakInfo.streak !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-white/60">Tap to view pet</div>
        </div>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20 card-glow animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                My Streak Pet
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <PetDisplay
              streak={streakInfo.streak}
              petStage={streakInfo.petStage}
              progressToNext={streakInfo.progressToNext}
              showDetails
            />

            <div className="mt-6 space-y-3">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/70 text-sm mb-1">Current Streak</div>
                <div className="text-2xl font-bold text-purple-400">
                  {streakInfo.streak} Day{streakInfo.streak !== 1 ? 's' : ''}
                </div>
              </div>
              {streakInfo.nextEvolutionStreak < Infinity && (
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-white/70 text-sm mb-1">Next Evolution</div>
                  <div className="text-lg font-medium text-blue-400">
                    {streakInfo.nextEvolutionStreak} Days
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${streakInfo.progressToNext * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm">
                  Study at least 1 card each day to maintain your streak!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
