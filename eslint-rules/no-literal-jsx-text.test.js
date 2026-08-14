import { createRuleTester } from './rule-tester.js';
import rule from './no-literal-jsx-text.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-literal-jsx-text', rule, {
  valid: [
    // The replacement.
    "const title = <h1>{t('catalog.page-title')}</h1>;",
    'const label = <span>{songTitle}</span>;',
    // Layout whitespace, which is most of the JSXText in any component.
    'const row = <div className="flex">\n  <Badge />\n  <Label />\n</div>;',
    "const spaced = <span>{first}{' '}{second}</span>;",
    // Separators and symbols.
    'const separator = <span>·</span>;',
    'const dash = <span>—</span>;',
    'const percent = <span>{ratio}%</span>;',
    'const parenthesised = <span>({count})</span>;',
    // Digits, which read the same in both catalogues.
    'const year = <span>2024</span>;',
    'const clock = <time>12:00</time>;',
    // A single letter.
    'const times = <span>x</span>;',
    // Attributes, which the rule leaves to a reviewer.
    'const image = <img alt="Runner portrait" className="h-10 w-10" />;',
    'const field = <input placeholder="Search" type="search" />;',
    // A template literal, whose halves the rule cannot read.
    'const greeting = <span>{`${firstName} ${lastName}`}</span>;',
    // A component with no children at all.
    'const spinner = <Spinner />;',
  ],
  invalid: [
    { code: 'const action = <button>Save</button>;', errors: [{ messageId: 'literalJsxText' }] },
    { code: 'const empty = <h2>No songs yet</h2>;', errors: [{ messageId: 'literalJsxText' }] },
    {
      code: "const cancel = <button>{'Cancel'}</button>;",
      errors: [{ messageId: 'literalJsxText' }],
    },
    {
      code: 'const mixed = <p>Lap {lapCount} of the race</p>;',
      errors: [{ messageId: 'literalJsxText' }, { messageId: 'literalJsxText' }],
    },
  ],
});

// Literal text is the assertion in a component test.
createRuleTester('apps/pragma/site/src/components/molecules/MemberChip.test.tsx').run(
  'no-literal-jsx-text (test file)',
  rule,
  {
    valid: ['render(<MemberChip label="Bass" />);\nconst node = <span>Bass</span>;'],
    invalid: [],
  },
);

// Infrastructure and back end code have no catalogue.
createRuleTester('infra/cdk/src/constructs/report.tsx').run(
  'no-literal-jsx-text (outside a site)',
  rule,
  {
    valid: ['const heading = <h1>Deployment report</h1>;'],
    invalid: [],
  },
);
