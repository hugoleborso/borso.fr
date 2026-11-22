export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export const DEFAULT_LOCALE = 'fr';

const REGION_SUFFIX = /-.*$/u;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

// @FollowsBlueprint utils-pure-module
export function isSupportedLocale(candidate: string): candidate is Locale {
  return SUPPORTED_LOCALES.some((locale) => locale === candidate);
}

export function detectInitialLocale(browserLanguage: string | undefined): Locale {
  if (browserLanguage === undefined) return DEFAULT_LOCALE;
  const base = browserLanguage.toLowerCase().replace(REGION_SUFFIX, '');
  if (isSupportedLocale(base)) return base;
  return DEFAULT_LOCALE;
}
