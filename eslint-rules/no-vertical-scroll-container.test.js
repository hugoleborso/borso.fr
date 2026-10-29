import rule from './no-vertical-scroll-container.js';
import { createRuleTester } from './rule-tester.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-vertical-scroll-container', rule, {
  valid: [
    'const strip = <ul className="flex overflow-x-auto gap-2">{chips}</ul>;',
    'const clip = <div className="overflow-hidden rounded-md">{cover}</div>;',
    'const list = <ul className="flex flex-col gap-1">{results}</ul>;',
    'const label = "overflow-y-auto";',
    {
      code: 'const body = <div data-sheet-body className="min-h-0 flex-1 overflow-y-auto">{children}</div>;',
      filename: 'apps/pragma/site/src/components/molecules/Sheet.tsx',
    },
  ],
  invalid: [
    {
      code: 'const list = <ul className="max-h-72 overflow-y-auto">{results}</ul>;',
      errors: [{ messageId: 'verticalScroll', data: { token: 'overflow-y-auto' } }],
    },
    {
      code: 'const BODY_CLASS = "min-h-0 flex-auto sm:overflow-scroll";',
      errors: [{ messageId: 'verticalScroll', data: { token: 'overflow-scroll' } }],
    },
    {
      code: 'const preview = <div className={composeClassName("p-4", "overflow-auto")} />;',
      errors: [{ messageId: 'verticalScroll', data: { token: 'overflow-auto' } }],
    },
    {
      code: 'const lines = <div className="overflow-y-scroll">{lines}</div>;',
      filename: 'apps/pragma/site/src/components/molecules/Sheet.tsx',
      options: [{ scrollFiles: ['SetlistScenePage.tsx'] }],
      errors: [{ messageId: 'verticalScroll' }],
    },
  ],
});

createRuleTester('apps/pragma/site/src/components/molecules/sheet.variants.ts', { jsx: false }).run(
  'no-vertical-scroll-container (variants file)',
  rule,
  {
    valid: ['export const sheetBodyVariants = cva("overflow-y-auto");'],
    invalid: [
      {
        code: 'export const listVariants = cva("overflow-y-auto");',
        filename: 'apps/pragma/site/src/components/molecules/list.variants.ts',
        errors: [{ messageId: 'verticalScroll' }],
      },
    ],
  },
);
