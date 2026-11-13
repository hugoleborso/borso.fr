import { defineStrykerConfig } from '../../stryker.shared.js';

const SOURCES_STRYKER_MAY_PREPEND_A_DIRECTIVE_TO = 'site/src/**/*.{ts,tsx}';

export default {
  ...defineStrykerConfig({
    mutate: [
      'site/src/**/*.core.ts',
      'site/src/**/*.utils.ts',
      'site/src/**/*.adapter.ts',
      'domain/**/*.core.ts',
      'scripts/**/*.core.ts',
      'scripts/**/*.adapter.ts',
    ],
  }),
  disableTypeChecks: SOURCES_STRYKER_MAY_PREPEND_A_DIRECTIVE_TO,
};
