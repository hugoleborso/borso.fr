import 'i18next';
import type en from './en.json';

// @FollowsBlueprint i18n-typed-keys
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
    returnNull: false;
  }
}
