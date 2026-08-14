import { createRuleTester } from './rule-tester.js';
import rule from './no-array-methods-in-controllers.js';

const controllerFile = 'apps/last-loop-lepin/api/src/punch/punch.controller.ts';
const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(controllerFile, { jsx: false }).run('no-array-methods-in-controllers', rule, {
  valid: [
    'const punch = await punchService.recordPunch(context.req.valid("json"));',
    'return context.json(punch, 201);',
    // A lookup that shares a name with `Array#find`.
    'const runner = await runnerService.find(runnerId);',
    'const edition = await editionRepository.find({ slug });',
    // The router chain, which is member calls all the way down.
    'const punchController = new Hono().post("/", zValidator("json", createPunchSchema), handler);',
    // A find whose argument is neither a callback nor domain data.
    'const header = context.req.header("authorization");',
  ],
  invalid: [
    {
      code: 'const titles = songs.map((song) => song.title);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    {
      code: 'const active = runners.filter((runner) => runner.isActive);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    {
      code: 'const total = punches.reduce((sum, punch) => sum + punch.lapCount, 0);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    {
      code: 'const leader = runners.find((runner) => runner.rank === 1);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    {
      code: 'const hasLate = punches.some((punch) => punch.isLate);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    {
      code: 'const allFinished = punches.every((punch) => punch.isFinished);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    // A named callback rather than an inline one, which is the same defect.
    {
      code: 'const bodies = punches.map(toPunchResponse);',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
    {
      code: 'const rows = Object.entries(counts).map(([slug, count]) => ({ slug, count }));',
      errors: [{ messageId: 'arrayMethodInController' }],
    },
  ],
});

// The service is where the iteration belongs, so the rule has to stay silent
// there and in the controller's own test.
createRuleTester(serviceFile, { jsx: false }).run(
  'no-array-methods-in-controllers (service file)',
  rule,
  {
    valid: ['const titles = songs.map((song) => song.title);'],
    invalid: [],
  },
);

createRuleTester('apps/last-loop-lepin/api/src/punch/punch.controller.test.ts', { jsx: false }).run(
  'no-array-methods-in-controllers (controller test)',
  rule,
  {
    valid: ['const titles = body.punches.map((punch) => punch.id);'],
    invalid: [],
  },
);
