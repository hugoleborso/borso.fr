import { createRuleTester } from './rule-tester.js';
import rule from './no-component-css-imports.js';

const componentFile = 'apps/borso-fr/site/components/Galaxy.tsx';
const entryPointFile = 'apps/pragma/site/src/main.tsx';

createRuleTester(componentFile).run('no-component-css-imports', rule, {
  valid: [
    "import { clsx } from 'clsx';",
    "import { cva } from 'class-variance-authority';",
    // A module whose name merely contains `css`.
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

// The entry point is where the one token file and every vendor stylesheet are
// loaded, and an application has one per bundle.
createRuleTester(entryPointFile).run('no-component-css-imports (entry point)', rule, {
  valid: [
    "import './styles/tokens.css';",
    "import '@fontsource/instrument-serif/400.css';",
    "import 'leaflet/dist/leaflet.css';",
  ],
  invalid: [],
});

// A stylesheet import in infrastructure or back end code is not a component
// style, and the rule stays out of it.
createRuleTester('infra/cdk/src/constructs/static-site.ts', { jsx: false }).run(
  'no-component-css-imports (outside a site)',
  rule,
  {
    valid: ["import './report.css';"],
    invalid: [],
  },
);
