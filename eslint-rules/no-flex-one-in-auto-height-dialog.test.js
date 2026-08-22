import rule from './no-flex-one-in-auto-height-dialog.js';
import { createRuleTester } from './rule-tester.js';

const COLLAPSING = `const modal = (
  <dialog className="max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden">
    <form className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">{fields}</div>
    </form>
  </dialog>
);`;

const REPAIRED = `const modal = (
  <dialog className="max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden">
    <form className="flex min-h-0 flex-auto flex-col">
      <div className="min-h-0 flex-auto overflow-y-auto">{fields}</div>
    </form>
  </dialog>
);`;

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-flex-one-in-auto-height-dialog', rule, {
  valid: [
    REPAIRED,
    'const modal = <dialog className="h-[85vh] sm:h-auto flex flex-col"><ul className="flex-1 overflow-y-auto" /></dialog>;',
    'const scene = <dialog className="w-screen h-dvh flex flex-col"><div className="flex-1 overflow-y-auto" /></dialog>;',
    'const row = <dialog className="flex flex-col"><div className="flex items-center"><span className="flex-1 truncate">{name}</span></div></dialog>;',
    'const page = <section className="flex flex-col"><div className="flex-1 overflow-y-auto" /></section>;',
    'const modal = <dialog className={DIALOG_CLASS}><div className="flex-1" /></dialog>;',
  ],
  invalid: [
    {
      code: COLLAPSING,
      errors: [{ messageId: 'zeroBasisChild' }, { messageId: 'zeroBasisChild' }],
    },
    {
      code: 'const modal = <dialog className="max-h-[80vh] flex flex-col"><div className="flex-1 overflow-y-auto" /></dialog>;',
      errors: [{ messageId: 'zeroBasisChild' }],
    },
    {
      code: 'const modal = <dialog className="flex flex-col"><div className="lg:flex-1" /></dialog>;',
      errors: [{ messageId: 'zeroBasisChild' }],
    },
  ],
});
