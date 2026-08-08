import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from './en.json';
import french from './fr.json';
import { FALLBACK_LANGUAGE, selectInitialLanguage } from './i18n.utils';
import { type LanguageStorage, readSavedLanguage } from './locale-storage.utils';

/**
 * Runtime i18next setup. Every decision it makes lives in `i18n.utils.ts`;
 * this module only reads the browser and hands the answers to i18next.
 */
export function readBrowserStorage(): LanguageStorage {
  return window.localStorage;
}

function readBrowserLanguages(): readonly string[] {
  return navigator.languages;
}

const initialLanguage = selectInitialLanguage(
  readSavedLanguage(readBrowserStorage()),
  readBrowserLanguages(),
);

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: english },
    fr: { translation: french },
  },
  lng: initialLanguage,
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18next };
