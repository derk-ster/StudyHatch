'use client';

import { useEffect, useState, type MouseEvent } from 'react';

type PronounceButtonProps = {
  text: string;
  languageCode: string;
  className?: string;
  label?: string;
  stopPropagation?: boolean;
};

const SPECIAL_VOICE_LANGS = new Set([
  'zh',
  'ja',
  'ko',
  'ar',
  'ru',
  'hi',
  'th',
  'bn',
  'fa',
  'ur',
]);

const LANGUAGE_CODE_MAP: Record<string, string> = {
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  ru: 'ru-RU',
  hi: 'hi-IN',
  th: 'th-TH',
  bn: 'bn-BD',
  fa: 'fa-IR',
  ur: 'ur-PK',
};

const resolveSpeechLang = (languageCode: string) => {
  const normalized = languageCode.toLowerCase();
  return LANGUAGE_CODE_MAP[normalized] || normalized;
};

const getPreferredVoice = (voices: SpeechSynthesisVoice[], languageCode: string) => {
  const normalized = languageCode.toLowerCase();
  return (
    voices.find(voice => voice.lang.toLowerCase() === normalized) ||
    voices.find(voice => voice.lang.toLowerCase().startsWith(`${normalized}-`)) ||
    voices.find(voice => voice.lang.toLowerCase().startsWith(normalized)) ||
    null
  );
};

export default function PronounceButton({
  text,
  languageCode,
  className,
  label = 'Play pronunciation',
  stopPropagation = true,
}: PronounceButtonProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const handleVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    handleVoices();
    window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
    };
  }, []);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }

    if (!isSupported || !text.trim()) {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const speechLang = resolveSpeechLang(languageCode);
    utterance.lang = speechLang;

    if (SPECIAL_VOICE_LANGS.has(languageCode.toLowerCase())) {
      const availableVoices = voices.length > 0 ? voices : synth.getVoices();
      const preferredVoice =
        getPreferredVoice(availableVoices, speechLang) ||
        getPreferredVoice(availableVoices, languageCode);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    synth.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      disabled={!isSupported || !text.trim()}
      className={`text-2xl leading-none opacity-70 hover:opacity-100 transition disabled:opacity-30 ${className || ''}`}
    >
      🔊
    </button>
  );
}
