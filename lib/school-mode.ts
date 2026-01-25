export const isSchoolModeEnabled = (): boolean => {
  if (typeof process === 'undefined') return false;
  const raw = process.env.NEXT_PUBLIC_SCHOOL_MODE ?? process.env.SCHOOL_MODE ?? '';
  return raw.toLowerCase() === 'true' || raw === '1';
};
