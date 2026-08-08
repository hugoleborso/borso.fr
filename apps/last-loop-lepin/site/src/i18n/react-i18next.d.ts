/**
 * Types every `t(...)` call against the English catalogue, so an unknown key
 * is a type error rather than a raw key rendered in the interface. The French
 * catalogue is held to the same key set by `i18n-parity.core.test.ts`.
 */

import 'i18next';
import type english from './en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof english };
    returnNull: false;
  }
}
