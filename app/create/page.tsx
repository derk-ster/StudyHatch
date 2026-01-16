'use client';

export const dynamic = 'force-dynamic';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { Deck, VocabCard } from '@/types/vocab';
import { saveDeck, canCreateDeck, canAddCards, getUserLimits, incrementDailyTranslations, incrementDailyDecks, getDailyUsage, getTimeUntilReset, getAllDecks, getClassesForSchool, getSchoolForUser, publishDeckToClass } from '@/lib/storage';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/lib/languages';
import { useAuth } from '@/lib/auth-context';
import { ClassRoom } from '@/types/vocab';

export default function CreateDeckPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es'); // Default to Spanish
  const [entryMode, setEntryMode] = useState<'auto' | 'manual'>('auto');
  const [wordsInput, setWordsInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDeck, setIsSavingDeck] = useState(false);
  const [error, setError] = useState('');
  const [translations, setTranslations] = useState<Array<{ english: string; translation: string; definition?: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<ClassRoom[]>([]);
  const [publishAllClasses, setPublishAllClasses] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  const limits = getUserLimits();
  const selectedLanguage = getLanguageByCode(targetLanguage);
  const dailyUsage = getDailyUsage();
  const presetClassId = searchParams.get('classId');

  useEffect(() => {
    if (session?.role !== 'teacher' || !session.userId) return;
    const school = getSchoolForUser(session.userId);
    if (!school) return;
    const classes = getClassesForSchool(school.id);
    setTeacherClasses(classes);
  }, [session?.role, session?.userId]);

  useEffect(() => {
    if (!presetClassId) return;
    setSelectedClassIds((prev) => (prev.includes(presetClassId) ? prev : [...prev, presetClassId]));
  }, [presetClassId]);

  const parseWordsInput = () => {
    return wordsInput
      .split(/[\n,]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  };

  const updateTranslationField = (index: number, field: 'english' | 'translation' | 'definition', value: string) => {
    setTranslations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddRow = () => {
    setTranslations(prev => [...prev, { english: '', translation: '', definition: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setTranslations(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    setTranslations(prev => {
      const updated = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= updated.length) {
        return updated;
      }
      const [moved] = updated.splice(index, 1);
      updated.splice(newIndex, 0, moved);
      return updated;
    });
  };

  const handleTranslate = async () => {
    if (!wordsInput.trim()) {
      setError('Please enter at least one word');
      return;
    }

    // Parse words (newline, comma, or space separated)
    const words = parseWordsInput();

    if (words.length === 0) {
      setError('Please enter at least one word');
      return;
    }

    // Check limits
    const canCreate = canCreateDeck();
    if (!canCreate.allowed) {
      setError(canCreate.reason || 'Cannot create deck');
      return;
    }

    // Check card limits for new deck (don't use canAddCards with empty deckId)
    const limits = getUserLimits();
    const existingDecks = getAllDecks();
    const totalCards = existingDecks.reduce((sum, d) => sum + d.cards.length, 0);
    const newTotal = totalCards + words.length;

    if (newTotal > limits.maxCards) {
      setError(`Free users can only have ${limits.maxCards} total cards. You currently have ${totalCards} cards. Upgrade to Premium for unlimited cards.`);
      return;
    }

    // Check daily card creation limit
    const dailyUsage = getDailyUsage();
    if (dailyUsage.translationsToday + words.length > limits.dailyTranslationLimit) {
      const remaining = limits.dailyTranslationLimit - dailyUsage.translationsToday;
      const timeUntilReset = getTimeUntilReset();
      const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
      setError(`Free users can only create ${limits.dailyTranslationLimit} cards per day. You have ${remaining} remaining today. Daily limit resets in ${hoursUntilReset} hour${hoursUntilReset !== 1 ? 's' : ''}. Upgrade to Premium for unlimited daily creation.`);
      return;
    }

    // Validate deck name before translating
    if (!deckName.trim()) {
      setError('Please enter a deck name before translating');
      return;
    }

    setIsCreating(true);
    setError('');

    if (entryMode === 'manual') {
      const manualRows = words.map(word => ({ english: word, translation: '', definition: '' }));
      setTranslations(manualRows);
      setShowPreview(true);
      setIsCreating(false);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          englishWords: words,
          targetLanguage: targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate words');
      }

      const data = await response.json();
      const translated = (data.translations || []).map((row: { english: string; translation: string }) => ({
        ...row,
        definition: '',
      }));
      setTranslations(translated);
      setShowPreview(true);
      
      // Track daily usage
      incrementDailyTranslations(words.length);
    } catch (err: any) {
      setError(err.message || 'Failed to translate words. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateDeck = async () => {
    // Prevent multiple submissions
    if (isSavingDeck) {
      return;
    }

    // Validate all required fields (description is optional)
    if (!deckName || !deckName.trim()) {
      setError('Please enter a deck name');
      return;
    }

    if (!translations || translations.length === 0) {
      setError('Please translate words first');
      return;
    }

    const invalidTranslations = translations.filter(t => 
      !t || !t.english || !t.english.trim() || !t.translation || !t.translation.trim()
    );

    if (translations.length === 0 || invalidTranslations.length > 0) {
      setError('Please fill in all English and translation fields or remove empty rows.');
      return;
    }

    // Create deck
    const cards: VocabCard[] = translations.map((trans, index) => ({
      id: `card-${Date.now()}-${index}`,
      translation: trans.translation.trim(),
      english: trans.english.trim(),
      definition: trans.definition?.trim() || undefined,
      example: undefined,
      category: undefined,
      notes: undefined,
    }));

    // Description is optional - use undefined if empty
    const deckDescriptionValue = deckDescription.trim() || undefined;
    
    const deck: Deck = {
      id: `deck-${Date.now()}`,
      name: deckName.trim(),
      description: deckDescriptionValue, // Can be undefined
      cards,
      createdDate: Date.now(),
      targetLanguage: targetLanguage,
      ownerUserId: session?.isGuest ? undefined : session?.userId,
      schoolId: session?.role === 'teacher' ? session?.schoolId : undefined,
    };

    // Clear any previous errors/success messages
    setError('');
    setShowSuccess(false);
    setIsSavingDeck(true);
    
    try {
      // Save deck (description can be undefined - that's fine)
      saveDeck(deck);

      if (session?.role === 'teacher') {
        const classIdsToPublish = publishAllClasses
          ? teacherClasses.map(cls => cls.id)
          : selectedClassIds;
        classIdsToPublish.forEach(classId => publishDeckToClass(deck.id, classId));
      }
      
      // Small delay to ensure localStorage is written
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify deck was saved by checking localStorage directly
      const savedDecks = getAllDecks();
      const savedDeck = savedDecks.find(d => 
        d.id === deck.id || 
        (d.name === deck.name && d.targetLanguage === deck.targetLanguage)
      );
      
      if (!savedDeck) {
        // Try one more time after a longer delay
        await new Promise(resolve => setTimeout(resolve, 300));
        const retryDecks = getAllDecks();
        const retryDeck = retryDecks.find(d => 
          d.id === deck.id || 
          (d.name === deck.name && d.targetLanguage === deck.targetLanguage)
        );
        
        if (!retryDeck) {
          console.error('Deck save verification failed. Deck:', deck);
          console.error('All saved decks:', retryDecks);
          throw new Error('Deck was not saved properly. Please try again.');
        }
      }
      
      // Track daily usage
      incrementDailyDecks();
      if (entryMode === 'manual') {
        incrementDailyTranslations(translations.length);
      }
      
      // Show success message
      setShowSuccess(true);
      setError(''); // Ensure no error is shown
      
      // Redirect after showing success message
      setTimeout(() => {
        router.push('/decks');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save deck. Please try again.';
      setError(errorMessage);
      setShowSuccess(false);
      setIsSavingDeck(false);
      console.error('Error saving deck:', err);
      console.error('Deck that failed to save:', deck);
    }
  };

  const handleReset = () => {
    setWordsInput('');
    setTranslations([]);
    setShowPreview(false);
    setError('');
    setShowSuccess(false);
    setTargetLanguage('es'); // Reset to default
    setEntryMode('auto');
  };

  return (
    <div className="min-h-screen bg-noise">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 card-glow p-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
            Create New Deck
          </h1>
          <p className="text-white/70 mb-8">
            Paste your English words and we'll automatically generate translations
          </p>

          {/* Limits Info */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6 space-y-2">
            <p className="text-white/80 text-sm">
              <strong className="text-white">Free Pass:</strong> {dailyUsage.decksCreatedToday} / {limits.dailyDeckLimit === Infinity ? '∞' : limits.dailyDeckLimit} decks today
              {limits.dailyDeckLimit !== Infinity && dailyUsage.decksCreatedToday >= limits.dailyDeckLimit && (
                <span className="text-yellow-400 ml-2">
                  (Resets in {Math.ceil(getTimeUntilReset() / (60 * 60 * 1000))} hour{Math.ceil(getTimeUntilReset() / (60 * 60 * 1000)) !== 1 ? 's' : ''})
                </span>
              )}
            </p>
            <p className="text-white/80 text-sm">
              <strong className="text-white">Total Decks:</strong> {limits.maxDecks === Infinity ? 'Unlimited' : `${getAllDecks().length} / ${limits.maxDecks}`} decks, {limits.maxCards === Infinity ? 'unlimited' : limits.maxCards} total cards
            </p>
            {limits.dailyTranslationLimit !== Infinity && (
              <p className="text-white/80 text-sm">
                <strong className="text-white">Daily Translation Limit:</strong> {dailyUsage.translationsToday} / {limits.dailyTranslationLimit} words today
                {dailyUsage.translationsToday >= limits.dailyTranslationLimit && (
                  <span className="text-yellow-400 ml-2">
                    (Resets in {Math.ceil(getTimeUntilReset() / (60 * 60 * 1000))} hour{Math.ceil(getTimeUntilReset() / (60 * 60 * 1000)) !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg animate-fade-in">
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          )}

          {showSuccess && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg animate-fade-in">
              <p className="text-green-400 font-medium text-lg">✅ New deck created!</p>
              <p className="text-green-300 text-sm mt-1">Redirecting to your decks...</p>
            </div>
          )}

          {!showPreview ? (
            <>
              <div className="space-y-6">
                <div>
                  <label htmlFor="deckName" className="block text-sm font-medium text-white/90 mb-2">
                    Deck Name *
                  </label>
                  <input
                    type="text"
                    id="deckName"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="My Vocabulary Deck"
                  />
                </div>

                <div>
                  <label htmlFor="deckDescription" className="block text-sm font-medium text-white/90 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    id="deckDescription"
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="A deck for learning common words"
                  />
                </div>

                <div>
                  <label htmlFor="targetLanguage" className="block text-sm font-medium text-white/90 mb-2">
                    Target Language *
                  </label>
                  <select
                    id="targetLanguage"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code} className="bg-gray-800">
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-white/60 text-sm mt-2">
                    Select the language you want to translate English words into
                  </p>
                </div>

                {session?.role === 'teacher' && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/80 text-sm mb-3">Publish deck to classes</p>
                    {teacherClasses.length === 0 ? (
                      <p className="text-white/60 text-sm">No classes found. Create a class first.</p>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm text-white/80">
                          <input
                            type="checkbox"
                            checked={publishAllClasses}
                            onChange={(e) => setPublishAllClasses(e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-white/10"
                          />
                          Publish to all classes
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {teacherClasses.map(classroom => (
                            <label key={classroom.id} className="flex items-center gap-2 text-sm text-white/70">
                              <input
                                type="checkbox"
                                checked={selectedClassIds.includes(classroom.id)}
                                onChange={(e) => {
                                  setSelectedClassIds(prev => (
                                    e.target.checked
                                      ? [...prev, classroom.id]
                                      : prev.filter(id => id !== classroom.id)
                                  ));
                                }}
                                disabled={publishAllClasses}
                                className="h-4 w-4 rounded border-white/20 bg-white/10"
                              />
                              <span>{classroom.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Entry Mode *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setEntryMode('auto')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                        entryMode === 'auto'
                          ? 'bg-purple-600/40 border-purple-400 text-white'
                          : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Auto Translate
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('manual')}
                      className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                        entryMode === 'manual'
                          ? 'bg-purple-600/40 border-purple-400 text-white'
                          : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      Manual Entry
                    </button>
                  </div>
                  <p className="text-white/60 text-sm mt-2">
                    {entryMode === 'auto'
                      ? 'We will translate automatically, then you can edit each entry.'
                      : 'Build an editable list without automatic translations.'}
                  </p>
                </div>

                <div>
                  <label htmlFor="wordsInput" className="block text-sm font-medium text-white/90 mb-2">
                    English Words *
                  </label>
                  <textarea
                    id="wordsInput"
                    value={wordsInput}
                    onChange={(e) => setWordsInput(e.target.value)}
                    required
                    rows={10}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
                    placeholder="Enter words separated by commas or new lines:&#10;Word1, Word2, Word3"
                  />
                  <p className="text-white/60 text-sm mt-2">
                    Separate words by commas or new lines. Each word will be translated to {selectedLanguage?.name || targetLanguage}.
                  </p>
                  {wordsInput.trim() && (
                    <p className="text-purple-300 text-sm mt-1 font-medium">
                      Translate {wordsInput.split(/[\n,]+/).filter(w => w.trim().length > 0).length} word{wordsInput.split(/[\n,]+/).filter(w => w.trim().length > 0).length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleTranslate}
                  disabled={isCreating || !wordsInput.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating
                    ? entryMode === 'auto'
                      ? 'Translating...'
                      : 'Preparing...'
                    : entryMode === 'auto'
                      ? 'Translate Words'
                      : 'Create Editable List'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Edit Word List</h2>
                <div className="bg-white/5 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                  {translations.map((trans, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center bg-white/5 p-3 rounded">
                      <input
                        value={trans.english}
                        onChange={(e) => updateTranslationField(index, 'english', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="English word"
                      />
                      <input
                        value={trans.translation}
                        onChange={(e) => updateTranslationField(index, 'translation', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`${selectedLanguage?.name || targetLanguage} translation`}
                      />
                      <input
                        value={trans.definition || ''}
                        onChange={(e) => updateTranslationField(index, 'definition', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Definition (optional)"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleMoveRow(index, 'up')}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveRow(index, 'down')}
                          className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="px-2 py-1 rounded bg-red-500/30 hover:bg-red-500/50 text-sm text-red-200"
                          aria-label="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                  >
                    + Add Row
                  </button>
                  <p className="text-white/60 text-sm self-center">
                    {translations.length} cards will be created
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all font-medium"
                >
                  Start Over
                </button>
                <button
                  onClick={handleCreateDeck}
                  disabled={!deckName.trim() || isSavingDeck}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingDeck ? 'Creating Deck...' : 'Create Deck'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
