import { createRuleTester } from './rule-tester.js';
import rule from './no-hidden-role-query.js';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/site/src/components/organisms/Row.test.tsx').run(
  'no-hidden-role-query',
  rule,
  {
    valid: [
      "screen.getByRole('menuitem', { name: 'Remove the break' });",
      "screen.queryByRole('dialog', { hidden: false });",
      "screen.getByRole('button', { hidden: isHidden });",
      "screen.getByText('Save', { hidden: true });",
      'openMenu({ hidden: true });',
      'screen[method]({ hidden: true });',
    ],
    invalid: [
      {
        code: "screen.getByRole('button', { name: 'Remove the break', hidden: true });",
        errors: [{ messageId: 'hiddenRoleQuery' }],
      },
      {
        code: "expect(queryByRole('button', { name: 'Add a break after', hidden: true })).toBeNull();",
        errors: [{ messageId: 'hiddenRoleQuery' }],
      },
      {
        code: "await within(sheet).findAllByRole('option', { hidden: true });",
        errors: [{ messageId: 'hiddenRoleQuery' }],
      },
    ],
  },
);

createRuleTester('apps/pragma/api/src/songs/songs.controller.test.ts', { jsx: false }).run(
  'no-hidden-role-query (back end file)',
  rule,
  { valid: ["screen.getByRole('button', { hidden: true });"], invalid: [] },
);
