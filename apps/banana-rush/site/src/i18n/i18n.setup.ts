/** @DependsOnExternal browser-local-storage */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';
import { DEFAULT_LOCALE, detectInitialLocale, type Locale } from './i18n.utils';
import { persistLocale, readPersistedLocale } from './locale-storage.utils';

export function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function recallLocale(): Locale | null {
  try {
    return readPersistedLocale(browserStorage());
  } catch {
    return null;
  }
}

const persistedLocale = recallLocale();
const initialLocale =
  persistedLocale ??
  detectInitialLocale(typeof navigator === 'undefined' ? undefined : navigator.language);

// @FollowsBlueprint i18n-setup
void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}

applyDocumentLanguage(i18next.language);
i18next.on('languageChanged', applyDocumentLanguage);

function rememberLocale(locale: Locale): void {
  try {
    persistLocale(browserStorage(), locale);
  } catch {
    return;
  }
}

export async function switchLocale(locale: Locale): Promise<void> {
  rememberLocale(locale);
  await i18next.changeLanguage(locale);
}

export { i18next };
