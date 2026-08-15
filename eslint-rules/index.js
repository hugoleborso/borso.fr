import atomicDesignComposition from './atomic-design-composition.js';
import atomicDesignImportDirection from './atomic-design-import-direction.js';
import conditionsLiveInPureFunctions from './conditions-live-in-pure-functions.js';
import functionNamesAreVerbPhrases from './function-names-are-verb-phrases.js';
import noAbbreviatedIdentifier from './no-abbreviated-identifier.js';
import noApiAnchorInSite from './no-api-anchor-in-site.js';
import noArrayMethodsInControllers from './no-array-methods-in-controllers.js';
import noCircleInNonUniformSvg from './no-circle-in-non-uniform-svg.js';
import noComponentCssImports from './no-component-css-imports.js';
import noControllerImportsOutsideService from './no-controller-imports-outside-service.js';
import noCrossSliceRepositoryImports from './no-cross-slice-repository-imports.js';
import noDatabaseClientOutsideRepository from './no-database-client-outside-repository.js';
import noDirectApiFetchInSite from './no-direct-api-fetch-in-site.js';
import noDiscardedAwaitBeforeNavigation from './no-discarded-await-before-navigation.js';
import noDynamicTranslationKeys from './no-dynamic-translation-keys.js';
import noFlatComponentsFolder from './no-flat-components-folder.js';
import noFrenchIdentifiers from './no-french-identifiers.js';
import noImpureCallsInCoreFiles from './no-impure-calls-in-core-files.js';
import noInlineSubscribeInUseSyncExternalStore from './no-inline-subscribe-in-use-sync-external-store.js';
import noLiteralJsxText from './no-literal-jsx-text.js';
import noQueryHooksOutsideOrganisms from './no-query-hooks-outside-organisms.js';
import noRawSqlOutsideMigrations from './no-raw-sql-outside-migrations.js';
import noServerStateInUseState from './no-server-state-in-use-state.js';
import noStringConcatenatedClassNames from './no-string-concatenated-class-names.js';
import noTypeAssertionExceptUnknown from './no-type-assertion-except-unknown.js';
import noUseEffect from './no-use-effect.js';
import noVendorSdkOutsideAdapter from './no-vendor-sdk-outside-adapter.js';
import pureFunctionsLiveInCoreFiles from './pure-functions-live-in-core-files.js';
import testFileHasSiblingSource from './test-file-has-sibling-source.js';

/**
 * The `borso` ESLint plugin holds every rule that encodes a decision from
 * `docs/standards/`, plus the rules that eradicate a defect recorded in
 * `docs/dantotsus/`.
 *
 * Each rule ships with a sibling `<rule-name>.test.js` RuleTester suite,
 * because a lint rule that misfires costs more than the rule saves.
 *
 * Registering a rule here does not turn it on. A rule runs only where
 * `eslint.config.js` lists it, and the standard each rule comes from is named
 * in the table in `docs/standards/12-linting-and-gates.md`.
 */
export const borsoPlugin = {
  meta: { name: 'borso' },
  rules: {
    'atomic-design-composition': atomicDesignComposition,
    'atomic-design-import-direction': atomicDesignImportDirection,
    'conditions-live-in-pure-functions': conditionsLiveInPureFunctions,
    'function-names-are-verb-phrases': functionNamesAreVerbPhrases,
    'no-abbreviated-identifier': noAbbreviatedIdentifier,
    'no-api-anchor-in-site': noApiAnchorInSite,
    'no-array-methods-in-controllers': noArrayMethodsInControllers,
    'no-circle-in-non-uniform-svg': noCircleInNonUniformSvg,
    'no-component-css-imports': noComponentCssImports,
    'no-controller-imports-outside-service': noControllerImportsOutsideService,
    'no-cross-slice-repository-imports': noCrossSliceRepositoryImports,
    'no-database-client-outside-repository': noDatabaseClientOutsideRepository,
    'no-direct-api-fetch-in-site': noDirectApiFetchInSite,
    'no-discarded-await-before-navigation': noDiscardedAwaitBeforeNavigation,
    'no-dynamic-translation-keys': noDynamicTranslationKeys,
    'no-flat-components-folder': noFlatComponentsFolder,
    'no-french-identifiers': noFrenchIdentifiers,
    'no-impure-calls-in-core-files': noImpureCallsInCoreFiles,
    'no-inline-subscribe-in-use-sync-external-store': noInlineSubscribeInUseSyncExternalStore,
    'no-literal-jsx-text': noLiteralJsxText,
    'no-query-hooks-outside-organisms': noQueryHooksOutsideOrganisms,
    'no-raw-sql-outside-migrations': noRawSqlOutsideMigrations,
    'no-server-state-in-use-state': noServerStateInUseState,
    'no-string-concatenated-class-names': noStringConcatenatedClassNames,
    'no-type-assertion-except-unknown': noTypeAssertionExceptUnknown,
    'no-use-effect': noUseEffect,
    'no-vendor-sdk-outside-adapter': noVendorSdkOutsideAdapter,
    'pure-functions-live-in-core-files': pureFunctionsLiveInCoreFiles,
    'test-file-has-sibling-source': testFileHasSiblingSource,
  },
};
