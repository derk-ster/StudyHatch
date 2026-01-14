// Mock translation dictionary for common phrases
// In production, this would be replaced by a real translation API

export const mockTranslations: Record<string, Record<string, string>> = {
  'i would like to apply to a job interview': {
    es: 'Me gustaría solicitar una entrevista de trabajo',
    fr: 'Je voudrais postuler pour un entretien d\'embauche',
    de: 'Ich möchte mich für ein Vorstellungsgespräch bewerben',
    it: 'Vorrei candidarmi per un colloquio di lavoro',
    pt: 'Gostaria de me candidatar a uma entrevista de emprego',
    zh: '我想申请工作面试',
    hi: 'मैं नौकरी के साक्षात्कार के लिए आवेदन करना चाहूंगा',
    ar: 'أود التقدم للحصول على مقابلة عمل',
    bn: 'আমি একটি চাকরির সাক্ষাত্কারের জন্য আবেদন করতে চাই',
    ru: 'Я хотел бы подать заявку на собеседование',
    id: 'Saya ingin melamar wawancara kerja',
  },
  'apply to a job interview': {
    es: 'Solicitar una entrevista de trabajo',
    fr: 'Postuler pour un entretien d\'embauche',
    de: 'Sich für ein Vorstellungsgespräch bewerben',
    it: 'Candidarsi per un colloquio di lavoro',
    pt: 'Candidatar-se a uma entrevista de emprego',
    zh: '申请工作面试',
    hi: 'नौकरी के साक्षात्कार के लिए आवेदन करें',
    ar: 'التقدم للحصول على مقابلة عمل',
    bn: 'চাকরির সাক্ষাত্কারের জন্য আবেদন করুন',
    ru: 'Подать заявку на собеседование',
    id: 'Melamar wawancara kerja',
  },
  'job interview': {
    es: 'Entrevista de trabajo',
    fr: 'Entretien d\'embauche',
    de: 'Vorstellungsgespräch',
    it: 'Colloquio di lavoro',
    pt: 'Entrevista de emprego',
    zh: '工作面试',
    hi: 'नौकरी का साक्षात्कार',
    ar: 'مقابلة عمل',
    bn: 'চাকরির সাক্ষাত্কার',
    ru: 'Собеседование',
    id: 'Wawancara kerja',
  },
  'hello': {
    es: 'Hola',
    fr: 'Bonjour',
    de: 'Hallo',
    it: 'Ciao',
    pt: 'Olá',
    zh: '你好',
    hi: 'नमस्ते',
    ar: 'مرحبا',
    bn: 'হ্যালো',
    ru: 'Привет',
    id: 'Halo',
  },
  'thank you': {
    es: 'Gracias',
    fr: 'Merci',
    de: 'Danke',
    it: 'Grazie',
    pt: 'Obrigado',
    zh: '谢谢',
    hi: 'धन्यवाद',
    ar: 'شكرا',
    bn: 'ধন্যবাদ',
    ru: 'Спасибо',
    id: 'Terima kasih',
  },
  'goodbye': {
    es: 'Adiós',
    fr: 'Au revoir',
    de: 'Auf Wiedersehen',
    it: 'Arrivederci',
    pt: 'Adeus',
    zh: '再见',
    hi: 'अलविदा',
    ar: 'وداعا',
    bn: 'বিদায়',
    ru: 'До свидания',
    id: 'Selamat tinggal',
  },
  'how are you': {
    es: '¿Cómo estás?',
    fr: 'Comment allez-vous?',
    de: 'Wie geht es dir?',
    it: 'Come stai?',
    pt: 'Como você está?',
    zh: '你好吗',
    hi: 'आप कैसे हैं',
    ar: 'كيف حالك',
    bn: 'আপনি কেমন আছেন',
    ru: 'Как дела?',
    id: 'Apa kabar?',
  },
  'i love you': {
    es: 'Te quiero',
    fr: 'Je t\'aime',
    de: 'Ich liebe dich',
    it: 'Ti amo',
    pt: 'Eu te amo',
    zh: '我爱你',
    hi: 'मैं तुमसे प्यार करता हूँ',
    ar: 'أحبك',
    bn: 'আমি তোমাকে ভালোবাসি',
    ru: 'Я тебя люблю',
    id: 'Aku cinta kamu',
  },
  'please': {
    es: 'Por favor',
    fr: 'S\'il vous plaît',
    de: 'Bitte',
    it: 'Per favore',
    pt: 'Por favor',
    zh: '请',
    hi: 'कृपया',
    ar: 'من فضلك',
    bn: 'অনুগ্রহ করে',
    ru: 'Пожалуйста',
    id: 'Tolong',
  },
  'excuse me': {
    es: 'Disculpe',
    fr: 'Excusez-moi',
    de: 'Entschuldigung',
    it: 'Scusi',
    pt: 'Com licença',
    zh: '对不起',
    hi: 'माफ़ करें',
    ar: 'عذراً',
    bn: 'মাফ করবেন',
    ru: 'Извините',
    id: 'Maaf',
  },
  'yes': {
    es: 'Sí',
    fr: 'Oui',
    de: 'Ja',
    it: 'Sì',
    pt: 'Sim',
    zh: '是',
    hi: 'हाँ',
    ar: 'نعم',
    bn: 'হ্যাঁ',
    ru: 'Да',
    id: 'Ya',
  },
  'no': {
    es: 'No',
    fr: 'Non',
    de: 'Nein',
    it: 'No',
    pt: 'Não',
    zh: '不',
    hi: 'नहीं',
    ar: 'لا',
    bn: 'না',
    ru: 'Нет',
    id: 'Tidak',
  },
};

export const getMockTranslation = (text: string, targetLanguage: string): string | null => {
  const normalizedText = text.toLowerCase().trim();
  
  // Direct match
  if (mockTranslations[normalizedText] && mockTranslations[normalizedText][targetLanguage]) {
    return mockTranslations[normalizedText][targetLanguage];
  }
  
  // Try to find partial matches for longer phrases
  for (const [key, translations] of Object.entries(mockTranslations)) {
    if (normalizedText.includes(key) || key.includes(normalizedText)) {
      if (translations[targetLanguage]) {
        return translations[targetLanguage];
      }
    }
  }
  
  return null;
};
