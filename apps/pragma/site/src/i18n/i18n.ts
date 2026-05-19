/**
 * Runtime i18n setup. The pure-helper layer lives in `i18n.utils.ts`;
 * this module is the side-effect bridge to `i18next` + `react-i18next`.
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import fr from './fr.json';
import { DEFAULT_LOCALE, detectInitialLocale } from './i18n.utils';

const initialLocale = detectInitialLocale(
  typeof navigator === 'undefined' ? undefined : navigator.language,
);

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

export { i18next };
