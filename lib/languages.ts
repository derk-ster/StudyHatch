import { Language } from '@/types/vocab';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'zh', name: 'Mandarin Chinese', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getLanguageName = (code: string): string => {
  const lang = getLanguageByCode(code);
  return lang?.name || code.toUpperCase();
};
