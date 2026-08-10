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

/**
 * @Blueprint i18n-setup
 * @BlueprintName i18n Runtime Setup
 * @BlueprintUsage Use for the module that builds the translation instance and keeps the document in step with the active language.
 * @BlueprintDescription Initialises i18next once at module scope with both catalogues as static imports, so the bundler sees them and no key is fetched at runtime, and takes the starting language from `selectInitialLanguage`, a pure function handed the saved choice and the browser languages rather than reading either itself. The `lang` attribute follows the active language through a module owned `languageChanged` subscription, which is a listener that lives for the page, so no component needs an effect to keep the document honest.
 */
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
