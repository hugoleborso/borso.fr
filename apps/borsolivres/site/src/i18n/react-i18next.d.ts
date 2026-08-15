/**
 * Types every `t(...)` call against the English catalogue, so a renamed or
 * mistyped key is a compile error rather than a raw key rendered on the page.
 * The English file is imported as a type only, so the declaration adds nothing
 * to the bundle.
 */

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
