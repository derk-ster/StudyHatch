'use client';

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  avatar?: string | null;
  score: number;
};

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export default function Leaderboard({
  entries,
  currentUserId,
  page,
  pageSize,
  onPageChange,
}: LeaderboardProps) {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/60">
              <th className="text-left py-2 px-2">Rank</th>
              <th className="text-left py-2 px-2">Student</th>
              <th className="text-right py-2 px-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-white/50">
                  No scores yet.
                </td>
              </tr>
            )}
            {pageEntries.map((entry) => {
              const isCurrentUser = currentUserId === entry.userId;
              return (
                <tr
                  key={entry.userId}
                  className={`border-t border-white/5 ${
                    isCurrentUser ? 'bg-purple-500/10 text-white' : 'text-white/80'
                  }`}
                >
                  <td className="py-2 px-2 font-semibold">{entry.rank}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={`${entry.username} avatar`}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-white/10 text-xs flex items-center justify-center">
                          {entry.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span>@{entry.username}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-semibold">{entry.score}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-white/70">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
