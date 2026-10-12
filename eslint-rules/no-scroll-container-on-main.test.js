import rule from './no-scroll-container-on-main.js';
import { createRuleTester } from './rule-tester.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-scroll-container-on-main', rule, {
  valid: [
    'const shell = <main className="flex-1 min-w-0 relative pb-16 lg:pb-0">{outlet}</main>;',
    'const shell = <main className="mx-auto flex min-h-0 flex-1 flex-col">{children}</main>;',
    'const scene = <div className="flex-1 overflow-y-auto">{lines}</div>;',
    'const shell = <main className="overflow-x-hidden">{children}</main>;',
    'const shell = <main className={SHELL_CLASS}>{children}</main>;',
  ],
  invalid: [
    {
      code: 'const shell = <main className="flex-1 overflow-y-auto overflow-x-hidden">{outlet}</main>;',
      errors: [{ messageId: 'scrollingMain' }],
    },
    {
      code: 'const shell = <main className="flex-1 overflow-auto">{outlet}</main>;',
      errors: [{ messageId: 'scrollingMain' }],
    },
    {
      code: 'const shell = <main className="flex-1 lg:overflow-y-scroll">{outlet}</main>;',
      errors: [{ messageId: 'scrollingMain' }],
    },
  ],
});
