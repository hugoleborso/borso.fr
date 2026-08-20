import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from './en.json';
import french from './fr.json';
import { FALLBACK_LANGUAGE, selectInitialLanguage } from './i18n.utils';
import { type LanguageStorage, readSavedLanguage } from './locale-storage.utils';

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

// @FollowsBlueprint i18n-setup
function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}

applyDocumentLanguage(i18next.language);
i18next.on('languageChanged', applyDocumentLanguage);

export { i18next };
