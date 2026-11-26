// @FollowsBlueprint utils-pure-module
import {
  type Check,
  type CommandResult,
  type HookWorld,
  PASS,
  type Verdict,
} from '../check.core.ts';
import { quoteForShell } from '../shell-quote.core.ts';

const USER_BIN_PATH = 'export PATH="$HOME/.local/bin:$PATH"\n';

function reportOutput(result: CommandResult): Verdict {
  const text = result.status === 0 ? result.stdout : `${result.stdout}${result.stderr}`;
  return text === '' ? PASS : { kind: 'context', text };
}

function persistToolPaths(world: HookWorld, environmentFile: string): void {
  world.run('tee', ['-a', environmentFile], USER_BIN_PATH);
  const browsers = world
    .run('bash', [`${world.projectDirectory}/scripts/browser/playwright-browsers.sh`])
    .stdout.replace(/\n+$/u, '');
  if (browsers === '') return;
  const line = `export PLAYWRIGHT_BROWSERS_PATH=${quoteForShell(browsers)}\n`;
  world.run('tee', ['-a', environmentFile], line);
}

export const sessionStart: Check = {
  name: 'session-start',
  tools: null,
  run(_input, world) {
    const install = world.run('bash', [`${world.projectDirectory}/scripts/install-repo-deps.sh`]);
    if (install.status !== 0) return reportOutput(install);
    const environmentFile = world.readEnvironment('CLAUDE_ENV_FILE');
    if (environmentFile) persistToolPaths(world, environmentFile);
    return reportOutput(install);
  },
};
