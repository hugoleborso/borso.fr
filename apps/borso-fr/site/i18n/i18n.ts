/**
 * The side-effecting half of the i18n layer.
 *
 * borso.fr is a French site. The i18n layer is here to keep copy out of the
 * components, not to serve a second language, so the language is pinned rather
 * than negotiated: there is no switcher anywhere in the site, and reading
 * `navigator.languages` would hand an English-locale visitor an English page
 * with no way back to the French one.
 *
 * `en.json` stays as the reference catalogue. It is what makes the parity test
 * able to ask whether a French value is actually translated, and it is the
 * source of the `TranslationKey` union. It is imported for types only, so it
 * does not reach the bundle.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import french from './fr.json';
import { DEFAULT_LANGUAGE } from './i18n.utils';

void i18next.use(initReactI18next).init({
  resources: {
    fr: { translation: french },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18next };
