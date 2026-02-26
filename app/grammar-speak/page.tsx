'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { getGrammarDeckById } from '@/lib/storage';
import { fuzzyMatch } from '@/lib/storage';
import { playSfx } from '@/lib/sfx';

const SPEECH_LANG_MAP: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  hi: 'hi-IN',
  ru: 'ru-RU',
};

function getSpeechRecognitionLang(targetLanguage: string): string {
  return SPEECH_LANG_MAP[targetLanguage.toLowerCase()] || targetLanguage;
}

export default function GrammarSpeakPage() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deck');
  const [deck, setDeck] = useState<ReturnType<typeof getGrammarDeckById>>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [spokenText, setSpokenText] = useState('');
  const [correctForm, setCorrectForm] = useState('');
  const [sessionResults, setSessionResults] = useState<Map<string, boolean>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [retryCards, setRetryCards] = useState<import('@/types/vocab').GrammarCard[] | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  useEffect(() => {
    if (deckId) {
      setDeck(getGrammarDeckById(deckId));
    } else {
      setDeck(undefined);
    }
    setCurrentIndex(0);
    setSpokenText('');
    setShowAnswer(false);
    setIsCorrect(null);
    setSessionResults(new Map());
    setShowResults(false);
    setRetryCards(null);
    setRecognitionError(null);
  }, [deckId]);

  const cards = deck?.cards ?? [];
  const shuffledCards = useMemo(() => {
    if (cards.length === 0) return [];
    return [...cards].sort(() => Math.random() - 0.5);
  }, [deckId, cards.length]);

  const effectiveCards = retryCards && retryCards.length > 0 ? retryCards : shuffledCards;
  const currentCard = effectiveCards[currentIndex];

  useEffect(() => {
    setSpokenText('');
    setShowAnswer(false);
    setIsCorrect(null);
    setRecognitionError(null);
  }, [currentIndex]);

  function getRecognitionErrorMessage(error: string): string {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone access was denied. Allow the microphone in your browser or device settings, then refresh and try again.';
      case 'no-speech':
        return 'No speech was detected. Speak clearly right after tapping the button and try again.';
      case 'audio-capture':
        return 'No microphone was found. Connect a microphone (or allow this device’s built-in mic) and try again.';
      case 'network':
        return 'Speech recognition needs an internet connection. Check your connection and try again.';
      case 'language-not-supported':
        return 'This language is not supported for speech recognition in your browser. Try Chrome or Edge.';
      case 'aborted':
        return '';
      default:
        return 'Something went wrong. Check that your microphone is working and try again.';
    }
  }

  const startListening = async () => {
    if (!deck || !currentCard) return;
    setRecognitionError(null);
    setSpokenText('');
    setShowAnswer(false);

    if (typeof window === 'undefined') return;
    const Win = window as unknown as {
      SpeechRecognition?: new (...args: unknown[]) => unknown;
      webkitSpeechRecognition?: new (...args: unknown[]) => unknown;
    };
    const SpeechRecognitionAPI = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setRecognitionError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    // Request microphone permission and verify we can use the mic before starting recognition
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setRecognitionError('Microphone access was denied. Allow the microphone when the browser asks, then try again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setRecognitionError('No microphone was found. Connect a microphone and refresh the page.');
      } else {
        setRecognitionError('Could not access the microphone. Check that a mic is connected and allowed for this site.');
      }
      return;
    }

    setIsListening(true);
    const recognition = new SpeechRecognitionAPI() as {
      continuous: boolean;
      interimResults: boolean;
      maxAlternatives: number;
      lang: string;
      onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.lang = getSpeechRecognitionLang(deck.targetLanguage);

    recognition.onresult = (event: { results: { 0: { 0: { transcript: string } } } }) => {
      const transcript = (event.results[0][0].transcript || '').trim();
      setSpokenText(transcript);
      const correct = fuzzyMatch(transcript, currentCard.answer);
      setIsCorrect(correct);
      setCorrectForm(currentCard.answer);
      setShowAnswer(true);
      playSfx(correct ? 'correct' : 'incorrect');
      setSessionResults(prev => new Map(prev).set(currentCard.id, correct));
    };
    recognition.onerror = (event: { error: string }) => {
      setIsListening(false);
      const message = getRecognitionErrorMessage(event.error);
      if (message) setRecognitionError(message);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
      setRecognitionError('Could not start listening. Try again.');
    }
  };

  const handleNext = () => {
    if (currentIndex < effectiveCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const missedCards = useMemo(
    () => effectiveCards.filter((c) => sessionResults.get(c.id) === false),
    [effectiveCards, sessionResults]
  );

  const correctCount = Array.from(sessionResults.values()).filter(Boolean).length;
  const totalCount = sessionResults.size;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  if (deck === undefined) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center text-white/80">
          Loading...
        </main>
      </div>
    );
  }

  if (!deck || effectiveCards.length === 0) {
    return (
      <div className="min-h-screen bg-noise">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-white/80 mb-4">Deck not found or has no cards.</p>
          <Link href="/grammar-decks" className="text-amber-400 hover:underline">
            ← Back to Grammar Decks
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link href="/grammar-decks" className="text-amber-400 hover:underline text-sm">
            ← {deck.name}
          </Link>
          <span className="text-white/60 text-sm">
            {currentIndex + 1} / {effectiveCards.length}
          </span>
        </div>

        {!showResults ? (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 card-glow">
            <p className="text-amber-200/90 text-sm uppercase tracking-wider mb-2">
              {currentCard.tense.replace(/-/g, ' ')} • {currentCard.person}
            </p>
            <h2 className="text-4xl font-bold text-white mb-2">
              {currentCard.infinitive}
            </h2>
            {currentCard.translation && (
              <p className="text-white/60 text-lg mb-6">({currentCard.translation})</p>
            )}
            {!currentCard.translation && <div className="mb-6" />}

            {!showAnswer ? (
              <>
                <p className="text-white/80 text-sm mb-4">
                  Say the conjugation out loud. Click the microphone to start.
                </p>
                {recognitionError && (
                  <p className="text-amber-300 text-sm mb-4 bg-amber-500/20 border border-amber-500/50 rounded-lg px-3 py-2">
                    {recognitionError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={startListening}
                  disabled={isListening}
                  className="w-full py-6 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/70 disabled:animate-pulse text-white font-semibold text-lg transition-colors flex items-center justify-center gap-3"
                >
                  <span className="text-3xl" aria-hidden>
                    🎤
                  </span>
                  {isListening ? 'Listening...' : 'Tap to speak'}
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {spokenText && (
                    <p className="text-white/90">
                      You said: <span className="font-medium">{spokenText}</span>
                    </p>
                  )}
                  <div
                    className={`w-full px-4 py-4 rounded-xl border-2 text-xl ${
                      isCorrect
                        ? 'bg-green-500/20 border-green-500/50 text-green-200'
                        : 'bg-red-500/20 border-red-500/50 text-red-200'
                    }`}
                  >
                    {isCorrect ? '✓ Correct pronunciation!' : `Correct: ${correctForm}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="mt-2 w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
                >
                  {currentIndex < effectiveCards.length - 1 ? 'Next' : 'See results'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 card-glow text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Session complete</h2>
            <p className="text-white/80 text-lg mb-6">
              {correctCount} / {totalCount} correct ({accuracy}%)
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {missedCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const shuffled = [...missedCards].sort(() => Math.random() - 0.5);
                    setRetryCards(shuffled);
                    setCurrentIndex(0);
                    setSessionResults(new Map());
                    setShowResults(false);
                    setSpokenText('');
                    setShowAnswer(false);
                  }}
                  className="px-6 py-3 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/40 text-white font-semibold"
                >
                  Redo missed ({missedCards.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setRetryCards(null);
                  setCurrentIndex(0);
                  setSessionResults(new Map());
                  setShowResults(false);
                  setSpokenText('');
                  setShowAnswer(false);
                }}
                className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                Practice again
              </button>
              <Link
                href="/grammar-decks"
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20"
              >
                Back to Grammar Decks
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
