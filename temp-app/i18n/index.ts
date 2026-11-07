import { en } from './en';
import { hi } from './hi';
import { hinglish } from './hinglish';

export type Language = 'en' | 'hi' | 'hinglish';

export const translations = {
  en,
  hi,
  hinglish,
} as const;

export type TranslationKeyPath = string;

/**
 * Simple parameter interpolation: replaces {paramName} with value
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Safe translation lookup with nested path resolution and fallback to English.
 * e.g. translate('hi', 'home.todaySales')
 */
export function translate(
  lang: Language,
  path: string,
  params?: Record<string, string | number>
): string {
  const parts = path.split('.');

  // Helper to traverse object
  const resolve = (obj: any): any => {
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  };

  const selectedDict = translations[lang] || translations.en;
  let result = resolve(selectedDict);

  // Fallback to English if missing in selected language
  if (!result && lang !== 'en') {
    result = resolve(translations.en);
  }

  if (!result) {
    return path; // Return raw key if not found
  }

  return interpolate(result, params);
}

