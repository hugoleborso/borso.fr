import { createRuleTester } from './rule-tester.js';
import rule from './conditions-live-in-pure-functions.js';

const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';
const controllerFile = 'apps/last-loop-lepin/api/src/punch/punch.controller.ts';
const coreFile = 'apps/last-loop-lepin/api/src/punch/punch.core.ts';
const componentFile = 'apps/pragma/site/src/components/organisms/Leaderboard.tsx';

createRuleTester(serviceFile, { jsx: false }).run('conditions-live-in-pure-functions', rule, {
  valid: [
    // The decision moved out, so the service is a straight line.
    'const decision = decidePunchAcceptance(punches, input, edition, now); return insert(decision.punch);',
    // A guard clause that only throws narrows a type rather than choosing.
    'function get(id: string) { if (id === null) { throw new NotFoundError(); } return load(id); }',
    'function get(id: string) { if (id === null) throw new NotFoundError(); return load(id); }',
    // `??` combines values.
    'const limit = requested ?? DEFAULT_LIMIT;',
    // A logical expression outside JSX combines values.
    'const label = runner.nickname || runner.firstName;',
  ],
  invalid: [
    {
      code: 'function rank(runner: Runner) { if (runner.laps > 3) { return "finisher"; } return "running"; }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const label = runner.finished ? "done" : "running";',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'switch (runner.status) { case "dnf": return 1; default: return 0; }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function get(id: string) { if (id === null) { logMissing(id); throw new NotFoundError(); } return load(id); }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'function get(id: string) { if (id === null) { return null; } return load(id); }',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
  ],
});

// A controller may map an absent resource to a 404 with a single return guard.
createRuleTester(controllerFile, { jsx: false }).run(
  'conditions-live-in-pure-functions (controller)',
  rule,
  {
    valid: [
      'async function handler(context) { const runner = await service.find(id); if (runner === null) { return context.json({ error: "not found" }, 404); } return context.json(runner); }',
    ],
    invalid: [
      {
        code: 'async function handler(context) { if (isAdmin) { return context.json(all); } else { return context.json(some); } }',
        errors: [{ messageId: 'moveToPureFunction' }],
      },
    ],
  },
);

// A pure file is where the branches are supposed to be.
createRuleTester(coreFile, { jsx: false }).run(
  'conditions-live-in-pure-functions (pure file)',
  rule,
  {
    valid: [
      'export function rank(runner: Runner) { if (runner.laps > 3) { return "finisher"; } return "running"; }',
      'export const label = (runner: Runner) => (runner.finished ? "done" : "running");',
    ],
    invalid: [],
  },
);

createRuleTester(componentFile).run('conditions-live-in-pure-functions (component)', rule, {
  valid: [
    'const Row = () => <span className={rowClassName}>{label}</span>;',
    // Composition through a lookup rather than a branch.
    'const Badge = BADGE_BY_KIND[selectRunnerBadgeKind(runner, edition)];',
  ],
  invalid: [
    {
      code: 'const Row = () => <span>{runner.finished && <Medal />}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
    {
      code: 'const Row = () => <span>{runner.finished ? <Medal /> : null}</span>;',
      errors: [{ messageId: 'moveToPureFunction' }],
    },
  ],
});
