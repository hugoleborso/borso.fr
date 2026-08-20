/** @DependsOnExternal browser-local-storage */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';
import { DEFAULT_LOCALE, detectInitialLocale } from './i18n.utils';
import { readPersistedLocale } from './locale-storage.utils';

export function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

const persistedLocale = readPersistedLocale(browserStorage());
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

export { i18next };
