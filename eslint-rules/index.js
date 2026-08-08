import conditionsLiveInPureFunctions from './conditions-live-in-pure-functions.js';
import noApiAnchorInSite from './no-api-anchor-in-site.js';
import noCircleInNonUniformSvg from './no-circle-in-non-uniform-svg.js';
import noControllerImportsOutsideService from './no-controller-imports-outside-service.js';
import noDirectApiFetchInSite from './no-direct-api-fetch-in-site.js';
import noImpureCallsInCoreFiles from './no-impure-calls-in-core-files.js';
import noInlineSubscribeInUseSyncExternalStore from './no-inline-subscribe-in-use-sync-external-store.js';
import noTypeAssertionExceptUnknown from './no-type-assertion-except-unknown.js';
import pureFunctionsLiveInCoreFiles from './pure-functions-live-in-core-files.js';

/**
 * The `borso` ESLint plugin holds every rule that encodes a decision from
 * `docs/standards/`, plus the rules that eradicate a defect recorded in
 * `docs/dantotsus/`.
 *
 * Each rule ships with a sibling `<rule-name>.test.js` RuleTester suite,
 * because a lint rule that misfires costs more than the rule saves.
 */
export const borsoPlugin = {
  meta: { name: 'borso' },
  rules: {
    'conditions-live-in-pure-functions': conditionsLiveInPureFunctions,
    'no-api-anchor-in-site': noApiAnchorInSite,
    'no-circle-in-non-uniform-svg': noCircleInNonUniformSvg,
    'no-controller-imports-outside-service': noControllerImportsOutsideService,
    'no-direct-api-fetch-in-site': noDirectApiFetchInSite,
    'no-impure-calls-in-core-files': noImpureCallsInCoreFiles,
    'no-inline-subscribe-in-use-sync-external-store': noInlineSubscribeInUseSyncExternalStore,
    'no-type-assertion-except-unknown': noTypeAssertionExceptUnknown,
    'pure-functions-live-in-core-files': pureFunctionsLiveInCoreFiles,
  },
};
