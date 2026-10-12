import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { z } from 'zod';
import { runCommand } from './canary-workspace';
import type { LintCanary } from './canaries.core';

const CASES_FILE_NAME = 'gate-canary-cases.jsonl';
const RULE_PREFIX = 'borso/';
const SUITE_QUALIFIER = /\s*\(.*\)$/;

const RECORDED_SUITE = z.object({
  name: z.string(),
  invalid: z.array(
    z.object({
      code: z.string(),
      filename: z.string(),
      options: z.unknown().optional(),
    }),
  ),
});

type RecordedCase = z.infer<typeof RECORDED_SUITE>['invalid'][number];

export interface RecordedRuleCases {
  readonly canaries: readonly LintCanary[];
  readonly suiteExitCode: number;
  readonly suiteOutput: string;
}

function readRecordedSuites(casesFile: string): ReadonlyMap<string, readonly RecordedCase[]> {
  const byRule = new Map<string, RecordedCase[]>();
  if (!existsSync(casesFile)) return byRule;
  for (const line of readFileSync(casesFile, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const parsed: unknown = JSON.parse(line);
    const suite = RECORDED_SUITE.parse(parsed);
    const ruleName = suite.name.replace(SUITE_QUALIFIER, '');
    byRule.set(ruleName, [...(byRule.get(ruleName) ?? []), ...suite.invalid]);
  }
  return byRule;
}

export function recordRuleTesterCanaries(
  root: string,
  rulesWithOwnCanary: ReadonlySet<string>,
): RecordedRuleCases {
  const casesDirectory = mkdtempSync(join(tmpdir(), 'gate-canary-cases-'));
  const casesFile = join(casesDirectory, CASES_FILE_NAME);
  const suite = runCommand(root, ['pnpm', 'exec', 'vitest', 'run', 'eslint-rules'], {
    GATE_CANARY_CASES: casesFile,
  });
  const canaries: LintCanary[] = [];
  for (const [ruleName, cases] of readRecordedSuites(casesFile)) {
    const mechanism = `${RULE_PREFIX}${ruleName}`;
    if (rulesWithOwnCanary.has(mechanism)) continue;
    const chosen = cases.find((candidate) => candidate.options === undefined);
    if (chosen === undefined) continue;
    canaries.push({
      mechanism,
      label: `eslint-rules/${ruleName}.test.js invalid case`,
      path: isAbsolute(chosen.filename) ? relative(root, chosen.filename) : chosen.filename,
      code: chosen.code,
    });
  }
  rmSync(casesDirectory, { force: true, recursive: true });
  return { canaries, suiteExitCode: suite.exitCode, suiteOutput: suite.output };
}
