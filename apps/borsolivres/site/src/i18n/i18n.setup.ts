/**
 * The i18next instance, and the one subscription that keeps the document's
 * `lang` attribute in step with the active language.
 *
 * The starting language comes from `selectInitialLocale`, a pure function
 * handed the saved choice and the browser language rather than reading either
 * itself.
 *
 * @DependsOnExternal browser-local-storage
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';
import { DEFAULT_LOCALE, selectInitialLocale } from './i18n.utils';
import { readPersistedLocale } from './locale-storage.utils';

export function browserStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}

function readBrowserLanguage(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.language;
}

// @FollowsBlueprint i18n-setup
void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: selectInitialLocale(readPersistedLocale(browserStorage()), readBrowserLanguage()),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/**
 * The `lang` attribute is what a screen reader picks a voice from, so it
 * follows the active language rather than sitting at whatever the entry HTML
 * was authored in. i18next emits `languageChanged` on every switch, and this
 * subscription lives for the page, so no component needs an effect for it.
 */
function applyDocumentLanguage(language: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
}

applyDocumentLanguage(i18next.language);
i18next.on('languageChanged', applyDocumentLanguage);

export { i18next };
