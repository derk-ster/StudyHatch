# StudyHatch

A modern, interactive vocabulary study application inspired by StudyStack, featuring beautiful UI, smooth animations, and multiple study modes. Create your own custom vocabulary decks by pasting English words and automatically generating Spanish translations.

## Features

### Study Modes
- **Flashcards**: Flip through cards with smooth animations, shuffle, star favorites, and filter options
- **Learn Mode**: Adaptive learning with typing practice and fuzzy matching
- **Match Game**: Match translation-English pairs with timer and best time tracking
- **Quiz Mode**: Multiple choice questions with scoring and streak tracking
- **Write Mode**: Type translations with accent-insensitive input checking
- **Word Scramble**: Unscramble words with hints
- **AI Chat**: Chat with AI assistant for study help, explanations, and practice (5 free messages/day, unlimited with subscription)

### User-Generated Decks
- **Create Custom Decks**: Paste English words (comma or newline separated) and automatically generate translations in your chosen language
- **Multiple Languages**: Support for 10+ languages (Spanish, French, Mandarin, Hindi, Arabic, and more)
- **Automatic Translation**: Uses translation API (DeepL/Google/LibreTranslate) or mock translations if no API key is configured
- **Deck Management**: Create, rename, and delete decks
- **Per-Deck Progress**: Track progress separately for each deck

### AI Chat Assistant
- **Study Help**: Ask questions about vocabulary, get explanations, and receive learning tips
- **Free Tier**: 5 AI messages per day
- **Subscription**: $1.99/month for unlimited AI chat access
- **Context-Aware**: AI can reference your decks and provide personalized study assistance

### Progress Tracking
- Track learned words, starred favorites, and learning status per deck
- Record accuracy, streaks, and game scores per deck
- Save progress in localStorage
- View detailed progress statistics for each deck

### UI/UX Features
- Modern gradient backgrounds with noise texture
- Smooth animations and micro-interactions
- Card-based layout with glow effects
- Responsive design (mobile + desktop)
- Dark theme with vibrant accents

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React 18**

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Spanish_Project_Website
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
Spanish_Project_Website/
├── app/
│   ├── flashcards/      # Flashcards study mode
│   ├── learn/           # Learn mode with adaptive learning
│   ├── match/           # Match game
│   ├── quiz/            # Quiz mode
│   ├── write/           # Write mode
│   ├── scramble/        # Word scramble game
│   ├── progress/        # Progress tracking page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/
│   └── Nav.tsx          # Navigation component
├── data/
│   └── vocab.old.ts     # Archived static vocabulary data (deprecated)
├── app/
│   ├── create/          # Create new deck page
│   ├── pricing/          # Premium pricing page
│   └── api/
│       ├── translate/   # Translation API endpoint
│       └── create-checkout-session/  # Stripe checkout (scaffolded)
├── lib/
│   └── storage.ts       # localStorage utilities
├── types/
│   └── vocab.ts         # TypeScript type definitions
└── README.md
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub/GitLab/Bitbucket

2. Import your repository in [Vercel](https://vercel.com)

3. Vercel will automatically detect Next.js and configure the build settings

4. Click "Deploy" - your site will be live!

### Deploy to Netlify

1. Push your code to GitHub/GitLab/Bitbucket

2. Import your repository in [Netlify](https://netlify.com)

3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`

4. Click "Deploy site"

### Environment Variables

#### Optional: Translation API Keys

To enable real Spanish translations (instead of mock translations), add one of the following to `.env.local`:

**Option 1: DeepL API** (Recommended)
```env
DEEPL_API_KEY=your_deepl_api_key_here
```

**Option 2: Google Translate API**
```env
GOOGLE_TRANSLATE_API_KEY=your_google_api_key_here
```

**Option 3: LibreTranslate** (Self-hosted, free)
```env
LIBRETRANSLATE_API_URL=https://libretranslate.com/translate
LIBRETRANSLATE_API_KEY=your_api_key_here  # Optional
```

**Note**: If no API key is provided, the app will use mock translations (e.g., "hello" → "hello (es)"). This is fine for testing, but you'll want to add a real API key for production.

#### Optional: Stripe Integration (Premium & Subscription Features)

To enable payment processing, add to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_AI_CHAT_PRICE_ID=price_xxx  # Price ID for $1.99/month AI chat subscription
```

**Note**: The app works without Stripe keys. Premium and subscription features are scaffolded but not required. Free users have limited daily usage.

#### Optional: AI Chat Integration

To enable real AI responses (instead of mock responses), add one of the following to `.env.local`:

**Option 1: OpenAI**
```env
OPENAI_API_KEY=sk-your_openai_api_key_here
```

**Option 2: Anthropic Claude**
```env
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here
```

**Note**: If no AI API key is provided, the chat will use mock responses. This is fine for testing, but you'll want to add a real API key for production.

## Usage

### Creating a Deck

1. Click "Create Deck" on the home page
2. Enter a deck name (and optional description)
3. Paste your English words (separated by commas or new lines)
4. Click "Translate" to generate Spanish translations
5. Review the preview and click "Create Deck"

### Free vs Premium Limits

**Free Users:**
- Maximum 2 decks
- Maximum 100 total cards across all decks
- 50 words translated per day
- 1 deck created per day
- 5 AI chat messages per day
- All study modes available

**Premium Users ($12.99 one-time payment):**
- Unlimited decks
- Unlimited cards
- Unlimited daily translations
- Unlimited daily deck creation
- 5 AI chat messages per day
- All study modes
- Priority support

**AI Chat Subscription ($1.99/month):**
- Unlimited AI chat messages
- Study assistance & explanations
- Vocabulary quizzes & practice
- Learning tips & strategies
- Cancel anytime

To upgrade, visit the Pricing page. Stripe integration is scaffolded but requires API keys to be configured.

### Styling

- Global styles: `app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Component styles: Inline Tailwind classes in components

## Features in Detail

### Flashcards
- Flip animation on click
- Shuffle deck
- Star/unstar cards
- Toggle Spanish/English first
- Show/hide examples
- Filter by favorites
- Mark as Known/Learning

### Learn Mode
- Adaptive learning (prioritizes missed cards)
- Fuzzy matching (accepts small typos)
- Accent-insensitive checking
- Progress tracking per card

### Match Game
- 6 pairs (12 cards total)
- Timer with best time tracking
- Smooth flip animations
- Progress bar

### Quiz Mode
- 10 questions per quiz
- Multiple choice (4 options)
- Score and streak tracking
- Review missed words at end

### Write Mode
- Type translations
- Accent-insensitive input
- Shows correct accented form if missed
- Example sentences

### Word Scramble
- Unscramble Spanish words
- Hint system (reduces points)
- Score tracking
- Example sentences

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and available for educational purposes.

## Contributing

Feel free to submit issues or pull requests to improve the application!
