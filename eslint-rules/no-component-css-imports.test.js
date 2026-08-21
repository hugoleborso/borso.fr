import { createRuleTester } from './rule-tester.js';
import rule from './no-component-css-imports.js';

const componentFile = 'apps/borso-fr/site/components/Galaxy.tsx';
const entryPointFile = 'apps/pragma/site/src/main.tsx';

// @FollowsBlueprint test-lint-rule
createRuleTester(componentFile).run('no-component-css-imports', rule, {
  valid: [
    "import { clsx } from 'clsx';",
    "import { cva } from 'class-variance-authority';",
    "import { toClassName } from '../lib/css-names.utils';",
    "import { tokens } from './tokens.css.json';",
  ],
  invalid: [
    {
      code: "import './Galaxy.css';",
      errors: [{ messageId: 'componentCssImport' }],
    },
    {
      code: "import 'leaflet/dist/leaflet.css';",
      errors: [{ messageId: 'componentCssImport' }],
    },
    {
      code: "import styles from './Galaxy.module.css';",
      errors: [{ messageId: 'componentCssImport' }],
    },
  ],
});

createRuleTester(entryPointFile).run('no-component-css-imports (entry point)', rule, {
  valid: [
    "import './styles/tokens.css';",
    "import '@fontsource/instrument-serif/400.css';",
    "import 'leaflet/dist/leaflet.css';",
  ],
  invalid: [],
});

createRuleTester('infra/cdk/src/constructs/static-site.ts', { jsx: false }).run(
  'no-component-css-imports (outside a site)',
  rule,
  {
    valid: ["import './report.css';"],
    invalid: [],
  },
);
