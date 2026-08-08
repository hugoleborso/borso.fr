import 'i18next';
import type english from './en.json';

/**
 * Types every `t(...)` call against the English catalogue, so a key that does
 * not exist is a typecheck failure rather than a raw key rendered in the user
 * interface. French parity is enforced by `i18n-parity.core.test.ts`.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof english };
    returnNull: false;
  }
}
