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
- **AI Chat**: Chat with AI assistant for study help, explanations, and practice (20 messages/day, teacher-controlled in School Edition)

### School Edition (FERPA/COPPA)
- **School Mode Flag**: Enable School Edition with `SCHOOL_MODE=true`
- **No Ads / No Data Sales**: No advertising or data selling
- **Teacher Controls**: Per-class toggles for AI tutor, student deck creation, and multiplayer games
- **AI Tutor Safety**: Hints-only responses when enabled by teachers
- **Private Multiplayer**: Teacher-hosted, classroom-only sessions
- **Activity Logs**: View student activity logs in the Teacher Dashboard
- **Request Data Deletion**: Built-in data deletion request link

### User-Generated Decks
- **Create Custom Decks**: Paste English words (comma or newline separated) and automatically generate translations in your chosen language
- **Multiple Languages**: Support for 10+ languages (Spanish, French, Mandarin, Hindi, Arabic, and more)
- **Automatic Translation**: Uses translation API (DeepL/Google/LibreTranslate) or mock translations if no API key is configured
- **Deck Management**: Create, rename, and  delete decks
- **Per-Deck Progress**: Track progress separately for each deck

### AI Chat Assistant
- **Study Help**: Ask questions about vocabulary, get explanations, and receive learning tips
- **Daily Limit**: 20 AI messages per day (teacher-controlled in School Edition)
- **Context-Aware**: AI can reference your decks and provide personalized study assistance
  - **School Edition**: AI tutor provides hints only (no direct answers)

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

## Security Notes

- Passwords are hashed with PBKDF2 in the local demo store (no plaintext passwords).
- For production school deployments, replace the demo auth with a managed provider
  (Supabase/Firebase/NextAuth) and server-side JWT/session enforcement.

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
│   └── api/
│       └── translate/   # Translation API endpoint
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

#### School Edition Mode

Enable School Edition (FERPA/COPPA-safe classroom mode):

```env
SCHOOL_MODE=true
```

Vercel instructions:
1. Go to your project settings → Environment Variables
2. Add `SCHOOL_MODE` with value `true`
3. Redeploy to apply changes

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

### Usage Limits

- Unlimited decks and cards
- Unlimited daily translations and deck creation
- 20 AI chat messages per day (teacher-controlled in School Edition)

### School Edition Compliance

When `SCHOOL_MODE=true`:
- AI tutor access is controlled by teachers
- AI tutor is off by default and must be enabled per class
- AI tutor provides hints only
- Multiplayer is classroom-only and teacher hosted
- Privacy and Terms pages are available at `/privacy` and `/terms`
- Data deletion requests can be submitted via `admin@studyhatch.org`


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
