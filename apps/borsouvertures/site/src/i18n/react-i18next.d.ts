import 'i18next';
import type english from './en.json';

/**
 * @Blueprint i18n-typed-keys
 * @BlueprintName Typed Translation Keys Declaration
 * @BlueprintUsage Use once per application, so an unknown or renamed translation key fails the typecheck instead of rendering as itself.
 * @BlueprintDescription Augments i18next's `CustomTypeOptions` with `resources: { translation: typeof english }`, which makes the English catalogue the single source of the key union every `t()` call is checked against. The English file is imported as a type only, so the declaration adds nothing to the bundle. `returnNull: false` is set here as well as in the runtime `init`, because the flag changes the declared return type of `t()` and the two would otherwise disagree; keys are then only assignable as literals, which is why a key chosen at runtime has to come from a frozen lookup rather than a template string.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof english };
    returnNull: false;
  }
}
