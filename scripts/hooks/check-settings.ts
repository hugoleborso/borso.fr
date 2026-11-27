// @FollowsBlueprint adapter-external-service
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHECKS_BY_EVENT } from './hook-events.ts';
import { listToolsNoMatcherReaches, selectForeignHookCommands } from './settings-hooks.core.ts';

const SETTINGS_PATH = resolve(import.meta.dirname, '../../.claude/settings.json');
const settings: unknown = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
const foreign = selectForeignHookCommands(settings).map(
  ({ event, command }) => `  ${event}: ${command} is not the one TypeScript entry`,
);
const unreached = listToolsNoMatcherReaches(settings, CHECKS_BY_EVENT).map(
  (pair) => `  ${pair}: a check reads this tool and no matcher of its event lets it through`,
);
const problems = [...foreign, ...unreached];
if (problems.length > 0) {
  process.stderr.write(`[hooks-are-typescript] .claude/settings.json:\n${problems.join('\n')}\n`);
  process.exitCode = 1;
}
