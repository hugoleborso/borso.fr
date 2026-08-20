import 'i18next';
import type english from './en.json';

// @FollowsBlueprint i18n-typed-keys
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof english };
    returnNull: false;
  }
}
