# Environment Variables Guide

This document lists all environment variables used in the StudyHatch application, organized by feature.

## Required for Production

### AI Chat Feature
**Required for AI chat to work:**
- `GROQ_API_KEY` - Your Groq API key (get free key at https://console.groq.com)
  - **Required**: Yes (AI chat won't work without it)
  - **Default**: None
  - **Note**: Groq offers a free tier with fast inference

**Optional:**
- `GROQ_MODEL` - Groq model to use (default: `llama-3.1-8b-instant`)
  - **Required**: No
  - **Default**: `llama-3.1-8b-instant`

## Optional (App works without these)

### Translation API
**For real-time translations (app works with free APIs if not set):**
- `DEEPL_API_KEY` - DeepL API key (recommended for high-quality translations)
  - **Required**: No
  - **Default**: None
  - **Note**: App falls back to free MyMemory/LibreTranslate APIs if not set

- `GOOGLE_TRANSLATE_API_KEY` - Google Translate API key
  - **Required**: No
  - **Default**: None
  - **Note**: Alternative to DeepL

- `LIBRETRANSLATE_API_KEY` - LibreTranslate API key (optional, some instances don't require it)
  - **Required**: No
  - **Default**: None

- `LIBRETRANSLATE_API_URL` - LibreTranslate API URL
  - **Required**: No
  - **Default**: `https://libretranslate.com/translate`


## Summary by Priority

### 🔴 Critical (App won't work properly without these)
1. `GROQ_API_KEY` - Required for AI chat feature

### 🟢 Optional (App works with fallbacks)
2. `GROQ_MODEL` - Optional, has default
3. `DEEPL_API_KEY` - Optional, free APIs used as fallback
4. `GOOGLE_TRANSLATE_API_KEY` - Optional, free APIs used as fallback
5. `LIBRETRANSLATE_API_KEY` - Optional
6. `LIBRETRANSLATE_API_URL` - Optional, has default

## Example .env.local File

Create a `.env.local` file in the root directory:

```env
# AI Chat (Required)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Translation (Optional - app uses free APIs if not set)
DEEPL_API_KEY=your_deepl_api_key_here
# OR
GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
# OR
LIBRETRANSLATE_API_KEY=your_libretranslate_key_here
LIBRETRANSLATE_API_URL=https://libretranslate.com/translate

```

## Deployment Notes

When deploying to Vercel, Netlify, or other platforms:

1. **Add environment variables** in your platform's dashboard
2. **Use `NEXT_PUBLIC_*` prefix** for variables that need to be accessible in the browser
3. **Never commit `.env.local`** to git (it should be in `.gitignore`)
4. **Set production values** for API keys when going live

## Getting API Keys

- **Groq**: https://console.groq.com (Free tier available)
- **DeepL**: https://www.deepl.com/pro-api
- **Google Translate**: https://cloud.google.com/translate/docs/setup
