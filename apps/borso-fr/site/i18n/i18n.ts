/**
 * The side-effecting half of the i18n layer. Every decision it makes lives in
 * `i18n.utils.ts`, so this module only reads the browser, hands the values to a
 * pure function, and applies the answer.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from './en.json';
import french from './fr.json';
import { DEFAULT_LANGUAGE, selectInitialLanguage } from './i18n.utils';
import { readSavedLanguage } from './locale-storage.utils';

const initialLanguage = selectInitialLanguage(
  readSavedLanguage(globalThis.localStorage),
  globalThis.navigator.languages,
);

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: english },
    fr: { translation: french },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18next };
