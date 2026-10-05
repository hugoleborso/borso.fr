import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';

const ONLY_LOCALE = 'fr';

// @FollowsBlueprint i18n-setup
void i18next.use(initReactI18next).init({
  resources: { [ONLY_LOCALE]: { translation: fr } },
  lng: ONLY_LOCALE,
  fallbackLng: ONLY_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});
