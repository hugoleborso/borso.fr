/**
 * Runtime i18n setup. The pure half lives in `i18n.utils.ts`; this module is
 * the side-effecting bridge to i18next and react-i18next.
 *
 * The starting language comes from the saved choice, then the browser
 * languages, then French. The saved choice is written by the language
 * switcher, so a manual switch survives a refresh.
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from './en.json';
import french from './fr.json';
import { DEFAULT_LANGUAGE, selectInitialLanguage, type SupportedLanguage } from './i18n.utils';
import { readSavedLanguage, writeSavedLanguage } from './locale-storage.utils';

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

/** Switch the interface language and remember the choice for next time. */
export function changeLanguage(language: SupportedLanguage): void {
  writeSavedLanguage(globalThis.localStorage, language);
  void i18next.changeLanguage(language);
}

/**
 * The `lang` attribute is what a screen reader picks a voice from and what a
 * browser offers to translate against, so it has to follow the active language
 * rather than sit at whatever the entry HTML was authored in. i18next emits
 * `languageChanged` on every switch, which is a subscription this module owns
 * for the life of the page — no component needs an effect for it.
 */
function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}

applyDocumentLanguage(i18next.language);
i18next.on('languageChanged', applyDocumentLanguage);

export { i18next };
