import { getLanguageByCode } from '@/lib/languages';

export default function LanguageBadge({ languageCode }: { languageCode: string }) {
  const language = getLanguageByCode(languageCode);
  
  if (!language) {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-white/10 rounded text-white/70">
        {languageCode.toUpperCase()}
      </span>
    );
  }

  return (
    <span className="px-2 py-1 text-xs font-medium bg-white/10 rounded text-white/70 flex items-center gap-1">
      {language.flag} {language.code.toUpperCase()}
    </span>
  );
}
