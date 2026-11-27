// @FollowsBlueprint utils-pure-module
import { type Check, PASS } from '../check.core.ts';
import { quoteForShell } from '../shell-quote.core.ts';

const SESSION_TEMPORARY_TEMPLATE = '/tmp/claude-session.XXXXXX';

export const sessionEnv: Check = {
  name: 'session-env',
  tools: null,
  run(_input, world) {
    const environmentFile = world.readEnvironment('CLAUDE_ENV_FILE');
    if (!environmentFile || world.readEnvironment('TMPDIR')) return PASS;
    const made = world.run('mktemp', ['-d', SESSION_TEMPORARY_TEMPLATE]);
    if (made.status !== 0) return PASS;
    const folder = made.stdout.replace(/\n+$/u, '');
    world.run('tee', ['-a', environmentFile], `export TMPDIR=${quoteForShell(folder)}\n`);
    return PASS;
  },
};
