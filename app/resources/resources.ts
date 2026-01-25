export type ResourceEntry = {
  id: string;
  title: string;
  overview: string;
  sections: { heading: string; body: string }[];
  keyPoints: string[];
};

export const RESOURCES: ResourceEntry[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with StudyHatch',
    overview:
      'StudyHatch is a focused workspace for vocabulary growth. Start by joining your class or creating your first deck, then choose a study mode to begin practicing.',
    sections: [
      {
        heading: 'First Login Checklist',
        body:
          'Confirm your role, join a classroom (if you are a student), and select a deck. Teachers can publish decks to classes so students always see the right content.',
      },
      {
        heading: 'Daily Study Rhythm',
        body:
          'Short, consistent study sessions are more effective than long, infrequent sessions. Aim for 10-15 minutes daily in two different modes.',
      },
    ],
    keyPoints: [
      'Join a class with a code if your teacher provides one.',
      'Pick one deck at a time to focus your practice.',
      'Rotate between flashcards and active recall modes.',
    ],
  },
  {
    id: 'creating-decks',
    title: 'Creating Decks that Stick',
    overview:
      'Great decks are concise, themed, and consistent. Use clear English prompts and accurate translations to keep practice smooth for students.',
    sections: [
      {
        heading: 'Deck Design Basics',
        body:
          'Keep each deck focused on one theme (food, travel, classroom, verbs). This helps memory and avoids overwhelming new learners.',
      },
      {
        heading: 'Teacher Publishing',
        body:
          'Teachers can publish decks to class rosters so students receive the exact vocabulary set without extra steps.',
      },
    ],
    keyPoints: [
      'Use short, clear English prompts.',
      'Keep deck sizes between 15-30 cards for mastery.',
      'Revisit definitions to clarify nuance.',
    ],
  },
  {
    id: 'study-overview',
    title: 'Study Modes Overview',
    overview:
      'Each study mode strengthens a different skill: recall, speed, accuracy, or confidence. Use a mix to build mastery.',
    sections: [
      {
        heading: 'Recall vs Recognition',
        body:
          'Flashcards build recognition while Write and Learn modes train recall. Blend both for stronger results.',
      },
      {
        heading: 'Game Modes',
        body:
          'Match and classroom games build speed and engagement. Use them after students have learned the basics.',
      },
    ],
    keyPoints: [
      'Start with Flashcards, then move to Write mode.',
      'Use Match and Quiz for review days.',
      'Rotate modes to prevent boredom.',
    ],
  },
  {
    id: 'flashcards',
    title: 'Flashcards Tips',
    overview:
      'Flashcards are ideal for first exposure and light review. Use short sessions to keep attention high.',
    sections: [
      {
        heading: 'Building a Routine',
        body:
          'Study a small set of cards repeatedly rather than rushing through a large deck. Aim for steady recall.',
      },
      {
        heading: 'Use Stars Wisely',
        body:
          'Star the hardest words and review them first during your next session.',
      },
    ],
    keyPoints: [
      'Study the same deck multiple times in a week.',
      'Shuffle to avoid memorizing order.',
      'Star difficult words for targeted review.',
    ],
  },
  {
    id: 'learn-mode',
    title: 'Learn Mode Mastery',
    overview:
      'Learn mode adapts to what you miss. It is perfect for bringing weak vocabulary to mastery.',
    sections: [
      {
        heading: 'Adaptive Practice',
        body:
          'The mode reintroduces words you miss more often, ensuring you reinforce weak spots before moving forward.',
      },
      {
        heading: 'Confidence Building',
        body:
          'Track correct streaks to build confidence. Small wins add up quickly.',
      },
    ],
    keyPoints: [
      'Don’t rush; accuracy beats speed.',
      'Review missed words immediately.',
      'Use Learn mode before quizzes.',
    ],
  },
  {
    id: 'match-game',
    title: 'Match Game Strategy',
    overview:
      'Match mode improves speed and automatic recall. It is best used after initial learning.',
    sections: [
      {
        heading: 'Speed with Accuracy',
        body:
          'As your time improves, accuracy should stay high. Slow down if you start guessing.',
      },
      {
        heading: 'Track Best Times',
        body:
          'Use your best time as a personal benchmark. Lower it gradually over time.',
      },
    ],
    keyPoints: [
      'Focus on accuracy before chasing speed.',
      'Replay the same deck for better retention.',
      'Treat mistakes as signals for review.',
    ],
  },
  {
    id: 'quiz-mode',
    title: 'Quiz Mode Strategy',
    overview:
      'Quiz mode tests recognition and reinforces multiple-choice memory cues. It is a great assessment tool.',
    sections: [
      {
        heading: 'Review Missed Words',
        body:
          'After a quiz, revisit the words you missed in Flashcards or Write mode.',
      },
      {
        heading: 'Teacher Use',
        body:
          'Teachers can use quiz scores to identify class-wide misconceptions.',
      },
    ],
    keyPoints: [
      'Take quizzes regularly to check progress.',
      'Use missed words to plan review sessions.',
      'Compare scores across weeks, not just days.',
    ],
  },
  {
    id: 'write-mode',
    title: 'Write Mode Accuracy',
    overview:
      'Write mode builds spelling and recall. It is one of the fastest ways to solidify vocabulary.',
    sections: [
      {
        heading: 'Accents and Precision',
        body:
          'Accents are optional, but StudyHatch highlights correct forms. Use that feedback to improve.',
      },
      {
        heading: 'Short Sessions',
        body:
          'Practice in 5-10 minute bursts for consistent gains.',
      },
    ],
    keyPoints: [
      'Use Write mode after flashcards.',
      'Focus on accuracy, not speed.',
      'Review incorrect answers immediately.',
    ],
  },
  {
    id: 'scramble-mode',
    title: 'Scramble Mode',
    overview:
      'Scramble mode reinforces spelling patterns and word structure in a playful way.',
    sections: [
      {
        heading: 'Pattern Recognition',
        body:
          'Unscrambling trains your brain to recognize common letter patterns and endings.',
      },
      {
        heading: 'Hint Discipline',
        body:
          'Hints reduce points. Use them sparingly to strengthen memory.',
      },
    ],
    keyPoints: [
      'Best for review and confidence.',
      'Use it after Write mode sessions.',
      'Replay scrambled words to master spelling.',
    ],
  },
  {
    id: 'translation-practice',
    title: 'Translation Practice',
    overview:
      'Translation practice prepares students to apply vocabulary in real contexts.',
    sections: [
      {
        heading: 'From Word to Meaning',
        body:
          'Translation practice helps students move from recognition to true understanding.',
      },
      {
        heading: 'Teacher Guidance',
        body:
          'Teachers can provide sentence-level practice to deepen comprehension.',
      },
    ],
    keyPoints: [
      'Translate short phrases first.',
      'Review definitions for nuance.',
      'Combine with Write mode for mastery.',
    ],
  },
  {
    id: 'ai-tutor',
    title: 'AI Tutor Guidelines',
    overview:
      'When enabled, the AI tutor offers hints and scaffolding only. It is designed to support, not replace, teacher instruction.',
    sections: [
      {
        heading: 'Hints, Not Answers',
        body:
          'Students should ask for guidance, examples, or steps rather than final answers.',
      },
      {
        heading: 'Teacher Control',
        body:
          'Teachers can enable or disable AI access per class based on classroom needs.',
      },
    ],
    keyPoints: [
      'Use AI for support and clarification.',
      'Teachers control AI access.',
      'AI responses avoid direct solutions.',
    ],
  },
  {
    id: 'classroom-games',
    title: 'Classroom Games',
    overview:
      'Classroom games create live, collaborative practice sessions with teacher-hosted control.',
    sections: [
      {
        heading: 'Hosting Sessions',
        body:
          'Teachers host games and share a code. Students join with their classroom accounts.',
      },
      {
        heading: 'Best Use Cases',
        body:
          'Use games as review days, warm-ups, or informal assessments.',
      },
    ],
    keyPoints: [
      'Teacher-hosted only in School Edition.',
      'Best used after students learn the deck.',
      'Keep games short for focus.',
    ],
  },
  {
    id: 'progress-tracking',
    title: 'Progress Tracking',
    overview:
      'Progress tracking shows growth over time and helps focus on weak areas.',
    sections: [
      {
        heading: 'Deck-Level Insights',
        body:
          'Track known words, quiz scores, and streaks per deck for targeted improvement.',
      },
      {
        heading: 'Teacher Insights',
        body:
          'Teachers can monitor class trends and adjust instruction accordingly.',
      },
    ],
    keyPoints: [
      'Review progress weekly.',
      'Use data to plan review sessions.',
      'Celebrate improvement, not perfection.',
    ],
  },
  {
    id: 'streaks-xp',
    title: 'Streaks & XP',
    overview:
      'Streaks reward consistency. XP helps students visualize growth and effort.',
    sections: [
      {
        heading: 'Consistency Wins',
        body:
          'Daily short practice sessions are the most effective way to build fluency.',
      },
      {
        heading: 'Motivation',
        body:
          'Streaks and XP keep students motivated and accountable over time.',
      },
    ],
    keyPoints: [
      'Study a little every day.',
      'Track streaks for accountability.',
      'Use XP as positive feedback.',
    ],
  },
  {
    id: 'privacy-safety',
    title: 'Privacy & Safety',
    overview:
      'StudyHatch School Edition follows FERPA and COPPA guidelines, with teacher-controlled access and no data sales.',
    sections: [
      {
        heading: 'Data Use',
        body:
          'Data is stored only for educational functionality such as progress tracking and classroom management.',
      },
      {
        heading: 'Parent & Teacher Rights',
        body:
          'Parents and teachers can request data deletion at any time.',
      },
    ],
    keyPoints: [
      'No ads or data sales.',
      'Teachers control AI and multiplayer.',
      'Deletion requests supported.',
    ],
  },
];
