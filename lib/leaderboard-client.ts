export type LeaderboardUpdatePayload = {
  points?: number;
  quizResult?: { correct: boolean };
  gameWin?: boolean;
  streakDays?: number;
};

export const updateLeaderboardsForUser = async (
  payload: LeaderboardUpdatePayload,
  classroomId?: string
) => {
  if (classroomId) {
    await fetch(`/api/classrooms/${classroomId}/leaderboard/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return;
  }

  const response = await fetch('/api/classrooms');
  if (!response.ok) return;
  const data = await response.json();
  const classes = data.classes || [];
  await Promise.all(
    classes.map((cls: { id: string }) =>
      fetch(`/api/classrooms/${cls.id}/leaderboard/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  );
};
