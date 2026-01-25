import { Language } from '@/types/vocab';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: 'Mandarin Chinese', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'jv', name: 'Javanese', flag: '🇮🇩' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'my', name: 'Burmese', flag: '🇲🇲' },
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getLanguageName = (code: string): string => {
  const lang = getLanguageByCode(code);
  return lang?.name || code.toUpperCase();
};
