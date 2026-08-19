/**
 * Types `t(...)` against the English catalogue, so a key that no longer exists
 * is a typecheck failure rather than a raw key rendered on the page. French
 * parity is enforced at runtime by `i18n-parity.core.test.ts`.
 */
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
