import { createRuleTester } from './rule-tester.js';
import rule from './no-array-methods-in-controllers.js';

const controllerFile = 'apps/last-loop-lepin/api/src/punch/punch.controller.ts';
const serviceFile = 'apps/last-loop-lepin/api/src/punch/punch.service.ts';

// @FollowsBlueprint test-lint-rule
createRuleTester(controllerFile, { jsx: false }).run('no-array-methods-in-controllers', rule, {
  valid: [
    'const punch = await punchService.recordPunch(context.req.valid("json"));',
    'return context.json(punch, 201);',
    'const runner = await runnerService.find(runnerId);',
    'const edition = await editionRepository.find({ slug });',
    'const punchController = new Hono().post("/", zValidator("json", createPunchSchema), handler);',
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
