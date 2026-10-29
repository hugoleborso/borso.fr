import rule from './no-arbitrary-tailwind-value.js';
import { createRuleTester } from './rule-tester.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-arbitrary-tailwind-value', rule, {
  valid: [
    'const row = <p className="text-meta text-ink-soft rounded-md shadow-raised">{title}</p>;',
    'const box = <div className="w-[calc(100vw-2rem)] max-w-[34rem] min-h-[44px]">{body}</div>;',
    'const LABEL_CLASS = "flex items-center gap-2 text-label uppercase";',
    'const link = <a href="#songs" className="underline">{label}</a>;',
    'const fill = "#a238ff";',
    'const cell = <span style={{ width: size, flexBasis: basis }} />;',
    'const label = <span title="rgba(0,0,0,0.5)">{text}</span>;',
  ],
  invalid: [
    {
      code: 'const title = <h2 className="font-display text-[17px] italic">{title}</h2>;',
      errors: [{ messageId: 'arbitraryValue', data: { token: 'text-[17px]' } }],
    },
    {
      code: 'const row = <li className={composeClassName("p-2", isActive && "bg-[rgba(26,22,18,0.05)]")} />;',
      errors: [{ messageId: 'arbitraryValue' }],
    },
    {
      code: 'const PILL_CLASS = `rounded-[999px] ${tone}`;',
      errors: [{ messageId: 'arbitraryValue', data: { token: 'rounded-[999px]' } }],
    },
    {
      code: 'const FLOAT_CLASS = "lg:shadow-[0_4px_12px_black]";',
      errors: [{ messageId: 'arbitraryValue', data: { token: 'lg:shadow-[0_4px_12px_black]' } }],
    },
    {
      code: 'const banner = <p className="border-[#e0a445] p-2">{text}</p>;',
      errors: [{ messageId: 'arbitraryValue', data: { token: '#e0a445' } }],
    },
    {
      code: 'const swatch = <span style={{ backgroundColor: member.color }} />;',
      errors: [{ messageId: 'styleColour' }],
    },
    {
      code: 'const glyph = <span style={isOn ? { color: tone } : {}} />;',
      errors: [{ messageId: 'styleColour' }],
    },
  ],
});

createRuleTester('apps/pragma/site/src/components/atoms/button.variants.ts', { jsx: false }).run(
  'no-arbitrary-tailwind-value (variants file)',
  rule,
  {
    valid: ['export const buttonVariants = cva("rounded-pill text-body", {});'],
    invalid: [
      {
        code: 'export const buttonVariants = cva("rounded-full", { variants: { tone: { glass: "bg-[rgba(255,255,255,0.1)]" } } });',
        errors: [{ messageId: 'arbitraryValue' }],
      },
    ],
  },
);

createRuleTester('apps/pragma/site/src/components/atoms/MemberMark.tsx').run(
  'no-arbitrary-tailwind-value (member colour atom)',
  rule,
  {
    valid: [
      'const mark = <span style={{ backgroundColor: color, borderColor: color }} />;',
      {
        code: 'const mark = <span style={{ color }} />;',
        filename: 'apps/pragma/site/src/components/atoms/Avatar.tsx',
      },
    ],
    invalid: [
      {
        code: 'const mark = <span style={{ color }} />;',
        filename: 'apps/pragma/site/src/components/atoms/Chip.tsx',
        options: [{ styleColourFiles: ['MemberMark.tsx'] }],
        errors: [{ messageId: 'styleColour' }],
      },
    ],
  },
);
