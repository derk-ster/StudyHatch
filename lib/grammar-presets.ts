/**
 * Preset conjugation entries for "site suggests words" grammar decks.
 * Format matches the create-grammar form rows: infinitive, tense, person, answer, translation (optional).
 */

export type PresetCardRow = {
  infinitive: string;
  tense: string;
  person: string;
  answer: string;
  translation?: string;
};

export type GrammarPreset = {
  id: string;
  languageCode: string;
  name: string;
  description: string;
  cards: PresetCardRow[];
};

const PERSONS = ['yo', 'tú', 'él/ella/usted', 'nosotros', 'vosotros', 'ellos/ellas/ustedes'] as const;

/** Spanish present tense - common regular and irregular verbs */
const SPANISH_PRESENT: PresetCardRow[] = [
  // hablar
  { infinitive: 'hablar', tense: 'present', person: 'yo', answer: 'hablo', translation: 'I speak' },
  { infinitive: 'hablar', tense: 'present', person: 'tú', answer: 'hablas', translation: 'you speak' },
  { infinitive: 'hablar', tense: 'present', person: 'él/ella/usted', answer: 'habla', translation: 'he/she speaks' },
  { infinitive: 'hablar', tense: 'present', person: 'nosotros', answer: 'hablamos', translation: 'we speak' },
  { infinitive: 'hablar', tense: 'present', person: 'vosotros', answer: 'habláis', translation: 'you all speak' },
  { infinitive: 'hablar', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'hablan', translation: 'they speak' },
  // comer
  { infinitive: 'comer', tense: 'present', person: 'yo', answer: 'como', translation: 'I eat' },
  { infinitive: 'comer', tense: 'present', person: 'tú', answer: 'comes', translation: 'you eat' },
  { infinitive: 'comer', tense: 'present', person: 'él/ella/usted', answer: 'come', translation: 'he/she eats' },
  { infinitive: 'comer', tense: 'present', person: 'nosotros', answer: 'comemos', translation: 'we eat' },
  { infinitive: 'comer', tense: 'present', person: 'vosotros', answer: 'coméis', translation: 'you all eat' },
  { infinitive: 'comer', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'comen', translation: 'they eat' },
  // vivir
  { infinitive: 'vivir', tense: 'present', person: 'yo', answer: 'vivo', translation: 'I live' },
  { infinitive: 'vivir', tense: 'present', person: 'tú', answer: 'vives', translation: 'you live' },
  { infinitive: 'vivir', tense: 'present', person: 'él/ella/usted', answer: 'vive', translation: 'he/she lives' },
  { infinitive: 'vivir', tense: 'present', person: 'nosotros', answer: 'vivimos', translation: 'we live' },
  { infinitive: 'vivir', tense: 'present', person: 'vosotros', answer: 'vivís', translation: 'you all live' },
  { infinitive: 'vivir', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'viven', translation: 'they live' },
  // ser
  { infinitive: 'ser', tense: 'present', person: 'yo', answer: 'soy', translation: 'I am' },
  { infinitive: 'ser', tense: 'present', person: 'tú', answer: 'eres', translation: 'you are' },
  { infinitive: 'ser', tense: 'present', person: 'él/ella/usted', answer: 'es', translation: 'he/she is' },
  { infinitive: 'ser', tense: 'present', person: 'nosotros', answer: 'somos', translation: 'we are' },
  { infinitive: 'ser', tense: 'present', person: 'vosotros', answer: 'sois', translation: 'you all are' },
  { infinitive: 'ser', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'son', translation: 'they are' },
  // estar
  { infinitive: 'estar', tense: 'present', person: 'yo', answer: 'estoy', translation: 'I am' },
  { infinitive: 'estar', tense: 'present', person: 'tú', answer: 'estás', translation: 'you are' },
  { infinitive: 'estar', tense: 'present', person: 'él/ella/usted', answer: 'está', translation: 'he/she is' },
  { infinitive: 'estar', tense: 'present', person: 'nosotros', answer: 'estamos', translation: 'we are' },
  { infinitive: 'estar', tense: 'present', person: 'vosotros', answer: 'estáis', translation: 'you all are' },
  { infinitive: 'estar', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'están', translation: 'they are' },
  // tener
  { infinitive: 'tener', tense: 'present', person: 'yo', answer: 'tengo', translation: 'I have' },
  { infinitive: 'tener', tense: 'present', person: 'tú', answer: 'tienes', translation: 'you have' },
  { infinitive: 'tener', tense: 'present', person: 'él/ella/usted', answer: 'tiene', translation: 'he/she has' },
  { infinitive: 'tener', tense: 'present', person: 'nosotros', answer: 'tenemos', translation: 'we have' },
  { infinitive: 'tener', tense: 'present', person: 'vosotros', answer: 'tenéis', translation: 'you all have' },
  { infinitive: 'tener', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'tienen', translation: 'they have' },
  // ir
  { infinitive: 'ir', tense: 'present', person: 'yo', answer: 'voy', translation: 'I go' },
  { infinitive: 'ir', tense: 'present', person: 'tú', answer: 'vas', translation: 'you go' },
  { infinitive: 'ir', tense: 'present', person: 'él/ella/usted', answer: 'va', translation: 'he/she goes' },
  { infinitive: 'ir', tense: 'present', person: 'nosotros', answer: 'vamos', translation: 'we go' },
  { infinitive: 'ir', tense: 'present', person: 'vosotros', answer: 'vais', translation: 'you all go' },
  { infinitive: 'ir', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'van', translation: 'they go' },
  // hacer
  { infinitive: 'hacer', tense: 'present', person: 'yo', answer: 'hago', translation: 'I do/make' },
  { infinitive: 'hacer', tense: 'present', person: 'tú', answer: 'haces', translation: 'you do/make' },
  { infinitive: 'hacer', tense: 'present', person: 'él/ella/usted', answer: 'hace', translation: 'he/she does/makes' },
  { infinitive: 'hacer', tense: 'present', person: 'nosotros', answer: 'hacemos', translation: 'we do/make' },
  { infinitive: 'hacer', tense: 'present', person: 'vosotros', answer: 'hacéis', translation: 'you all do/make' },
  { infinitive: 'hacer', tense: 'present', person: 'ellos/ellas/ustedes', answer: 'hacen', translation: 'they do/make' },
];

export const GRAMMAR_PRESETS: GrammarPreset[] = [
  {
    id: 'es-present-common',
    languageCode: 'es',
    name: 'Spanish – Present tense (common verbs)',
    description: 'Regular -ar, -er, -ir verbs (hablar, comer, vivir) plus ser, estar, tener, ir, hacer',
    cards: SPANISH_PRESENT,
  },
];

export function getPresetsForLanguage(languageCode: string): GrammarPreset[] {
  return GRAMMAR_PRESETS.filter(p => p.languageCode === languageCode);
}

export function getPresetById(presetId: string): GrammarPreset | undefined {
  return GRAMMAR_PRESETS.find(p => p.id === presetId);
}
