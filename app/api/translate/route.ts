import { NextRequest, NextResponse } from 'next/server';
import { getMockTranslation } from '@/lib/mock-translations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { englishWords, targetLanguage } = body;

    if (!englishWords || !Array.isArray(englishWords) || englishWords.length === 0) {
      return NextResponse.json(
        { error: 'English words array is required' },
        { status: 400 }
      );
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return NextResponse.json(
        { error: 'Target language is required' },
        { status: 400 }
      );
    }

    // If target language is English, skip translation
    if (targetLanguage === 'en') {
      const noTranslation = englishWords.map((word: string) => ({
        english: word.trim(),
        translation: word.trim(),
      }));
      return NextResponse.json({
        translations: noTranslation,
        mock: false,
        note: 'Target language is English, no translation needed.',
      });
    }

    // Check if translation API key exists
    const hasApiKey = !!(
      process.env.DEEPL_API_KEY ||
      process.env.GOOGLE_TRANSLATE_API_KEY ||
      process.env.LIBRETRANSLATE_API_KEY
    );

    // Get language code for mock translation
    const langCode = targetLanguage.toLowerCase();

    // If no API key, try LibreTranslate public API (free, no key required)
    if (!hasApiKey) {
      try {
        // Try LibreTranslate public API first (free, no API key needed)
        const translations = await Promise.all(
          englishWords.map(async (word: string) => {
            const trimmedWord = word.trim();
            
            // First try dictionary lookup
            const dictTranslation = getMockTranslation(trimmedWord, langCode);
            if (dictTranslation) {
              return {
                english: trimmedWord,
                translation: dictTranslation,
              };
            }
            
            // Try MyMemory Translation API (free, no API key required)
            try {
              const langMap: Record<string, string> = {
                'es': 'es',
                'fr': 'fr',
                'de': 'de',
                'it': 'it',
                'pt': 'pt',
                'zh': 'zh-CN',
                'hi': 'hi',
                'ar': 'ar',
                'bn': 'bn',
                'ru': 'ru',
                'id': 'id',
              };
              
              const targetLang = langMap[langCode] || langCode;
              const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmedWord)}&langpair=en|${targetLang}`;
              
              console.log('Calling MyMemory API:', apiUrl);
              
              const response = await fetch(apiUrl, {
                method: 'GET',
                headers: { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              });
              
              console.log('MyMemory API response status:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('MyMemory API data:', data);
                
                if (data.responseData && data.responseData.translatedText) {
                  const translation = data.responseData.translatedText.trim();
                  // MyMemory sometimes returns the same text if translation fails, check if it's different
                  if (translation.toLowerCase() !== trimmedWord.toLowerCase() && 
                      !translation.includes('MYMEMORY WARNING') &&
                      !translation.includes('QUERY LENGTH LIMIT')) {
                    console.log('Using MyMemory translation:', translation);
                    return {
                      english: trimmedWord,
                      translation: translation,
                    };
                  }
                }
              }
            } catch (error) {
              console.error('MyMemory Translation API error:', error);
            }
            
            // Fallback: Try LibreTranslate
            try {
              const response = await fetch('https://libretranslate.com/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  q: trimmedWord,
                  source: 'en',
                  target: langCode,
                  format: 'text',
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.translatedText) {
                  return {
                    english: trimmedWord,
                    translation: data.translatedText,
                  };
                }
              }
            } catch (error) {
              console.error('LibreTranslate API error:', error);
            }
            
            // Final fallback - return dictionary translation or indicate we need a real API
            if (dictTranslation) {
              return {
                english: trimmedWord,
                translation: dictTranslation,
              };
            }
            
            // If no dictionary match and no API worked, return a helpful message
            return {
              english: trimmedWord,
              translation: `[Translation unavailable - please add a translation API key for real-time translations]`,
            };
          })
        );

        return NextResponse.json({
          translations,
          mock: !hasApiKey,
        });
      } catch (error) {
        console.error('Translation error:', error);
        // Fallback to dictionary-only
        const mockTranslations = englishWords.map((word: string) => {
          const trimmedWord = word.trim();
          const betterTranslation = getMockTranslation(trimmedWord, langCode);
          return {
            english: trimmedWord,
            translation: betterTranslation || `${trimmedWord} (${langCode.toUpperCase()})`,
          };
        });
        return NextResponse.json({
          translations: mockTranslations,
          mock: true,
        });
      }
    }

    // Real API integration would go here
    // Example with DeepL (uncomment and configure):
    /*
    import * as deepl from 'deepl-node';
    const translator = new deepl.Translator(process.env.DEEPL_API_KEY!);
    
    const translations = await Promise.all(
      englishWords.map(async (word: string) => {
        const result = await translator.translateText(word.trim(), 'en', targetLanguage);
        return {
          english: word.trim(),
          translation: result.text,
        };
      })
    );
    
    return NextResponse.json({ translations });
    */

    // Example with Google Translate API (uncomment and configure):
    /*
    import { Translate } from '@google-cloud/translate/build/src/v2';
    const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_API_KEY });
    
    const translations = await Promise.all(
      englishWords.map(async (word: string) => {
        const [translation] = await translate.translate(word.trim(), targetLanguage);
        return {
          english: word.trim(),
          translation: translation,
        };
      })
    );
    
    return NextResponse.json({ translations });
    */

    // Example with LibreTranslate (self-hosted, free):
    /*
    const translations = await Promise.all(
      englishWords.map(async (word: string) => {
        const response = await fetch(process.env.LIBRETRANSLATE_API_URL || 'https://libretranslate.com/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: word.trim(),
            source: 'en',
            target: targetLanguage,
            format: 'text',
            api_key: process.env.LIBRETRANSLATE_API_KEY,
          }),
        });
        const data = await response.json();
        return {
          english: word.trim(),
          translation: data.translatedText,
        };
      })
    );
    
    return NextResponse.json({ translations });
    */

    // Fallback: Try LibreTranslate if other APIs fail
    try {
      const translations = await Promise.all(
        englishWords.map(async (word: string) => {
          const trimmedWord = word.trim();
          
          // Try dictionary first
          const dictTranslation = getMockTranslation(trimmedWord, langCode);
          if (dictTranslation) {
            return {
              english: trimmedWord,
              translation: dictTranslation,
            };
          }
          
          // Try MyMemory Translation API (free, no API key required)
          try {
            const langMap: Record<string, string> = {
              'es': 'es',
              'fr': 'fr',
              'de': 'de',
              'it': 'it',
              'pt': 'pt',
              'zh': 'zh',
              'hi': 'hi',
              'ar': 'ar',
              'bn': 'bn',
              'ru': 'ru',
              'id': 'id',
            };
            
            const targetLang = langMap[langCode] || langCode;
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmedWord)}&langpair=en|${targetLang}`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.responseData && data.responseData.translatedText) {
                const translation = data.responseData.translatedText;
                // MyMemory sometimes returns the same text if translation fails, check if it's different
                if (translation.toLowerCase() !== trimmedWord.toLowerCase()) {
                  return {
                    english: trimmedWord,
                    translation: translation,
                  };
                }
              }
            }
          } catch (error) {
            console.error('MyMemory Translation API error:', error);
          }
          
          // Fallback: Try LibreTranslate
          try {
            const response = await fetch('https://libretranslate.com/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                q: trimmedWord,
                source: 'en',
                target: langCode,
                format: 'text',
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.translatedText) {
                return {
                  english: trimmedWord,
                  translation: data.translatedText,
                };
              }
            }
          } catch (error) {
            console.error('LibreTranslate API error:', error);
          }
          
          return {
            english: trimmedWord,
            translation: dictTranslation || `${trimmedWord} (${langCode.toUpperCase()})`,
          };
        })
      );
      
      return NextResponse.json({ translations });
    } catch (error) {
      console.error('Translation fallback error:', error);
      // Final fallback
      const mockTranslations = englishWords.map((word: string) => {
        const trimmedWord = word.trim();
        const betterTranslation = getMockTranslation(trimmedWord, langCode);
        return {
          english: trimmedWord,
          translation: betterTranslation || `${trimmedWord} (${langCode.toUpperCase()})`,
        };
      });
      return NextResponse.json({ translations: mockTranslations, mock: true });
    }

    return NextResponse.json({
      translations: mockTranslations,
      mock: true,
      note: 'API key detected but integration not implemented. Using mock translations.',
    });
  } catch (error: any) {
    console.error('Error translating words:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to translate words' },
      { status: 500 }
    );
  }
}
