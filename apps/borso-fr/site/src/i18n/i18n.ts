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

// @FollowsBlueprint i18n-setup
export { i18next };
