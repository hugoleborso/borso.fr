import 'i18next';
import type fr from './fr.json';

// @FollowsBlueprint i18n-typed-keys
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
    returnNull: false;
  }
}
