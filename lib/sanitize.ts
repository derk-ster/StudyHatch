const stripTags = (value: string): string => value.replace(/<[^>]*>/g, '');

const stripControlChars = (value: string): string => value.replace(/[\u0000-\u001F\u007F]/g, '');

export const sanitizeText = (value: string): string => {
  return stripControlChars(stripTags(value)).trim();
};

export const sanitizeArray = (values: string[]): string[] => {
  return values.map((value) => sanitizeText(value)).filter((value) => value.length > 0);
};
