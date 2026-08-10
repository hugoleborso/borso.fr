/**
 * Module augmentation that types the i18next `t(...)` call against the
 * EN catalog (`en.json`). After this lands, mistyping a translation
 * key — `t('setlist.transitionWarn')` instead of
 * `t('setlist.transitionWarning')` — is a typecheck error, not a
 * runtime miss that ships as a raw key in the UI.
 *
 * The `i18next` module owns the `CustomTypeOptions` interface (see
 * `node_modules/i18next/typescript/options.d.ts`); augmenting it is
 * what react-i18next reads through to type its `useTranslation()` hook.
 * The EN catalog is the source of truth — FR/parity is enforced by
 * the runtime `i18n-parity.core.test.ts` gate.
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
