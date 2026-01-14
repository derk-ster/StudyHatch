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

### Stripe Payment Processing
**Required for Stripe payments (card payments):**
- `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_test_` or `sk_live_`)
  - **Required**: Yes (for `/api/create-payment-intent` and other Stripe features)
  - **Default**: None
  - **Note**: Used in `create-payment-intent`, `create-checkout-session`, `create-subscription`, `cancel-subscription`

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key (starts with `pk_test_` or `pk_live_`)
  - **Required**: Yes (for client-side Stripe integration)
  - **Default**: None
  - **Note**: Used in `app/request-vocab/page.tsx` for Stripe Elements

**Optional:**
- `STRIPE_AI_CHAT_PRICE_ID` - Stripe Price ID for AI Chat subscription ($1.99/month)
  - **Required**: No (only if using Stripe subscriptions)
  - **Default**: None
  - **Note**: Format: `price_xxxxx`

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

### Alternative Payment Methods
**For Cash App and PayPal integration:**
- `NEXT_PUBLIC_CASH_APP_TAG` - Your Cash App tag (e.g., `$StudyHatch01`)
  - **Required**: No
  - **Default**: `$StudyHatch01`
  - **Note**: Used in payment verification flow

- `CASH_APP_TAG` - Alternative server-side Cash App tag
  - **Required**: No
  - **Default**: Falls back to `NEXT_PUBLIC_CASH_APP_TAG` or `$StudyHatch01`

- `NEXT_PUBLIC_PAYPAL_USERNAME` - Your PayPal username for PayPal.me links
  - **Required**: No
  - **Default**: Empty string
  - **Note**: Used in payment verification flow

### Email Service (Request Vocab Feature)
**For sending emails when users request custom vocab:**
- `RESEND_API_KEY` - Resend API key for sending emails
  - **Required**: No
  - **Default**: None
  - **Note**: Currently emails are logged to console. Uncomment Resend code in `app/api/request-vocab/route.ts` to enable

### Base URL
**For redirect URLs in payment flows:**
- `NEXT_PUBLIC_BASE_URL` - Your production URL (e.g., `https://yourdomain.com`)
  - **Required**: No
  - **Default**: `http://localhost:3000`
  - **Note**: Used in Stripe checkout success/cancel URLs

## Summary by Priority

### 🔴 Critical (App won't work properly without these)
1. `GROQ_API_KEY` - Required for AI chat feature

### 🟡 Important (Required for payment features)
2. `STRIPE_SECRET_KEY` - Required for Stripe card payments
3. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Required for Stripe card payments

### 🟢 Optional (App works with fallbacks)
4. `GROQ_MODEL` - Optional, has default
5. `STRIPE_AI_CHAT_PRICE_ID` - Only if using Stripe subscriptions
6. `DEEPL_API_KEY` - Optional, free APIs used as fallback
7. `GOOGLE_TRANSLATE_API_KEY` - Optional, free APIs used as fallback
8. `LIBRETRANSLATE_API_KEY` - Optional
9. `LIBRETRANSLATE_API_URL` - Optional, has default
10. `NEXT_PUBLIC_CASH_APP_TAG` - Optional, has default
11. `NEXT_PUBLIC_PAYPAL_USERNAME` - Optional
12. `RESEND_API_KEY` - Optional, emails logged to console
13. `NEXT_PUBLIC_BASE_URL` - Optional, has default

## Example .env.local File

Create a `.env.local` file in the root directory:

```env
# AI Chat (Required)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Stripe (Required for card payments)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_AI_CHAT_PRICE_ID=price_xxxxx

# Translation (Optional - app uses free APIs if not set)
DEEPL_API_KEY=your_deepl_api_key_here
# OR
GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
# OR
LIBRETRANSLATE_API_KEY=your_libretranslate_key_here
LIBRETRANSLATE_API_URL=https://libretranslate.com/translate

# Alternative Payments (Optional)
NEXT_PUBLIC_CASH_APP_TAG=$StudyHatch01
NEXT_PUBLIC_PAYPAL_USERNAME=your_paypal_username

# Email (Optional)
RESEND_API_KEY=your_resend_api_key_here

# Base URL (Optional)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Deployment Notes

When deploying to Vercel, Netlify, or other platforms:

1. **Add environment variables** in your platform's dashboard
2. **Use `NEXT_PUBLIC_*` prefix** for variables that need to be accessible in the browser
3. **Never commit `.env.local`** to git (it should be in `.gitignore`)
4. **Set production values** - Use `sk_live_` and `pk_live_` for Stripe in production

## Getting API Keys

- **Groq**: https://console.groq.com (Free tier available)
- **Stripe**: https://dashboard.stripe.com/apikeys
- **DeepL**: https://www.deepl.com/pro-api
- **Google Translate**: https://cloud.google.com/translate/docs/setup
- **Resend**: https://resend.com/api-keys
