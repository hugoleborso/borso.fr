/**
 * @DependsOnExternal node-process
 */
// @FollowsBlueprint adapter-external-service
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  type Check,
  type CommandResult,
  type HookEvent,
  type HookInput,
  type HookOutcome,
  type HookWorld,
  describeRefusedCall,
  PASS,
  renderOutcome,
  selectChecksFor,
  type Verdict,
} from './check.core.ts';

const PROJECT_DIRECTORY =
  process.env['CLAUDE_PROJECT_DIR'] ?? resolve(import.meta.dirname, '..', '..');

function readTextOrNull(path: string): string | null {
  try {
    return readFileSync(resolve(PROJECT_DIRECTORY, path), 'utf8');
  } catch {
    return null;
  }
}

function runCommand(command: string, args: readonly string[], input?: string): CommandResult {
  const result = spawnSync(command, args, { cwd: PROJECT_DIRECTORY, input, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const WORLD: HookWorld = {
  projectDirectory: PROJECT_DIRECTORY,
  readEnvironment: (name) => process.env[name],
  readText: readTextOrNull,
  run: runCommand,
};

function runSafely(check: Check, input: HookInput): Verdict {
  try {
    return check.run(input, WORLD);
  } catch (error) {
    process.stderr.write(`[hook-error] ${check.name}: ${String(error)}\n`);
    return PASS;
  }
}

function logRefusals(outcome: HookOutcome, input: HookInput): void {
  const isLoggingRefusals = process.env['KAIZEN_LOG_REFUSALS'] !== '0';
  if (!isLoggingRefusals || !existsSync(join(PROJECT_DIRECTORY, 'KAIZEN.md'))) return;
  for (const { rule, summary } of outcome.refusals) {
    runCommand(join(PROJECT_DIRECTORY, 'scripts/kaizen.sh'), [
      '--from',
      `hook:${rule}`,
      '--where',
      describeRefusedCall(input),
      summary,
    ]);
  }
}

export function runHook(checksByEvent: Readonly<Record<HookEvent, readonly Check[]>>): void {
  const input: HookInput = JSON.parse(readFileSync(0, 'utf8'));
  const checks = checksByEvent[input.hook_event_name] ?? [];
  const verdicts = selectChecksFor(checks, input.tool_name).map((check) => runSafely(check, input));
  const outcome = renderOutcome(input.hook_event_name, verdicts);
  logRefusals(outcome, input);
  process.stdout.write(outcome.stdout);
  process.stderr.write(outcome.stderr);
  process.exitCode = outcome.exitCode;
}
