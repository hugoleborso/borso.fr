import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { COMMAND_CANARIES, LINT_CANARIES, MECHANISMS_THAT_GATE_NOTHING } from './canary-registry';
import { recordRuleTesterCanaries } from './canary-rule-cases';
import { CanaryWorkspace, runCommand } from './canary-workspace';
import {
  collectMechanisms,
  judgeCommandRun,
  judgeLintRun,
  listCheckedGenerators,
  renderOutcome,
  selectFailures,
  selectStrayCanaries,
  selectUnguardedMechanisms,
  type CanaryOutcome,
  type CanaryTier,
  type CommandCanary,
  type LintCanary,
  type Mechanism,
} from './canaries.core';
import {
  buildLedgerInput,
  CHECK_SCRIPT_PATTERN,
  listInvocationSites,
  listTrackedFiles,
} from './ledger-input';
import { readConfiguredRuleName } from './lint-configuration.core';

const REPOSITORY_ROOT = process.cwd();
const OXLINT = 'node_modules/.bin/oxlint';
const JSON_REPORT_START = '{';

const LINT_REPORT = z.object({
  diagnostics: z.array(z.object({ code: z.string().optional(), message: z.string() })),
});

const RULE_LIST = z.array(
  z.object({ scope: z.string(), value: z.string(), type_aware: z.boolean() }),
);

interface Options {
  readonly inventoryOnly: boolean;
  readonly tier: CanaryTier | null;
  readonly only: string | null;
  readonly keepWorkspace: boolean;
}

function readOptions(argv: readonly string[]): Options {
  const onlyIndex = argv.indexOf('--only');
  const tierIndex = argv.indexOf('--tier');
  const tier = tierIndex >= 0 ? argv[tierIndex + 1] : undefined;
  return {
    inventoryOnly: argv.includes('--inventory'),
    tier: tier === 'fast' || tier === 'slow' ? tier : null,
    only: onlyIndex >= 0 ? (argv[onlyIndex + 1] ?? null) : null,
    keepWorkspace: argv.includes('--keep'),
  };
}

function listMechanisms(): readonly Mechanism[] {
  const input = buildLedgerInput();
  const citations = input.standards.flatMap((standard) => standard.citations);
  const trackedFiles = listTrackedFiles();
  const checkScripts = trackedFiles
    .filter((file) => CHECK_SCRIPT_PATTERN.test(file))
    .map((target) => ({ kind: 'script', target }));
  const siteTexts = listInvocationSites().map((site) =>
    readFileSync(join(REPOSITORY_ROOT, site), 'utf8'),
  );
  const generators = listCheckedGenerators(siteTexts).map((target) => ({
    kind: 'generator',
    target,
  }));
  return collectMechanisms([...citations, ...checkScripts, ...generators]).filter(
    (mechanism) => !MECHANISMS_THAT_GATE_NOTHING.has(mechanism.target),
  );
}

function isSelected(
  options: Options,
  canary: { readonly mechanism: string; readonly label: string },
): boolean {
  if (options.only === null) return true;
  return canary.mechanism.includes(options.only) || canary.label.includes(options.only);
}

function readTypeAwareRules(): ReadonlySet<string> {
  const listed = runCommand(REPOSITORY_ROOT, [OXLINT, '--rules', '--format', 'json']);
  const parsed: unknown = JSON.parse(listed.output);
  return new Set(
    RULE_LIST.parse(parsed)
      .filter((rule) => rule.type_aware)
      .map((rule) => `${rule.scope}/${rule.value}`),
  );
}

function readLintReport(output: string): z.infer<typeof LINT_REPORT> {
  const parsed: unknown = JSON.parse(output.slice(output.indexOf(JSON_REPORT_START)));
  return LINT_REPORT.parse(parsed);
}

function runLintCanaries(
  workspace: CanaryWorkspace,
  canaries: readonly LintCanary[],
): readonly CanaryOutcome[] {
  const typeAwareRules = readTypeAwareRules();
  const outcomes: CanaryOutcome[] = [];
  for (const canary of canaries) {
    workspace.plant({ [canary.path]: canary.code });
    const typeAwareFlag = typeAwareRules.has(canary.mechanism) ? ['--type-aware'] : [];
    const run = workspace.run([OXLINT, '--format', 'json', ...typeAwareFlag, canary.path]);
    const diagnostics = readLintReport(run.output).diagnostics;
    const reported = diagnostics.map((diagnostic) => readConfiguredRuleName(diagnostic.code));
    const fatal = diagnostics
      .filter((diagnostic) => diagnostic.code === undefined)
      .map((diagnostic) => diagnostic.message);
    outcomes.push({
      mechanism: canary.mechanism,
      label: `${canary.label} at ${canary.path}`,
      ...judgeLintRun(reported, canary.mechanism, fatal),
    });
    process.stdout.write('.');
  }
  workspace.restore();
  process.stdout.write('\n');
  return outcomes;
}

function runCommandCanary(workspace: CanaryWorkspace, canary: CommandCanary): CanaryOutcome {
  const started = Date.now();
  try {
    if (canary.plant !== undefined) workspace.plant(canary.plant);
    const problems = workspace.applyEdits(canary.edits ?? []);
    if (problems.length > 0) {
      return {
        mechanism: canary.mechanism,
        label: canary.label,
        verdict: 'broken',
        detail: problems.join('\n'),
      };
    }
    if (canary.stage === true) workspace.stage();
    const result = workspace.run(canary.command, canary.environment);
    return {
      mechanism: canary.mechanism,
      label: canary.label,
      ...judgeCommandRun(result, canary.refusal),
    };
  } finally {
    workspace.restore();
    console.log(`  ${canary.label}: ${String(Math.round((Date.now() - started) / 1000))} s`);
  }
}

function isEveryGateGuarded(
  mechanisms: readonly Mechanism[],
  canaries: readonly { readonly mechanism: string }[],
): boolean {
  const canaryTargets = canaries.map((canary) => canary.mechanism);
  const unguarded = selectUnguardedMechanisms(mechanisms, new Set(canaryTargets));
  const stray = selectStrayCanaries(canaryTargets, mechanisms);
  for (const mechanism of unguarded) {
    console.error(`no canary: ${mechanism.kind} ${mechanism.target} — nothing proves it can fail`);
  }
  for (const target of stray) {
    console.error(`stray canary: ${target} names no mechanism the ledger or a hook knows`);
  }
  console.log(
    `${String(mechanisms.length)} gate(s), ${String(mechanisms.length - unguarded.length)} with a canary.`,
  );
  return unguarded.length === 0 && stray.length === 0;
}

function readLintCanaries(): readonly LintCanary[] | null {
  const recorded = recordRuleTesterCanaries(
    REPOSITORY_ROOT,
    new Set(LINT_CANARIES.map((canary) => canary.mechanism)),
  );
  if (recorded.suiteExitCode !== 0) {
    console.error(
      `the eslint-rules suites fail before any canary is planted:\n${recorded.suiteOutput}`,
    );
    return null;
  }
  return [...recorded.canaries, ...LINT_CANARIES];
}

function didEveryCanaryGetRefused(lintCanaries: readonly LintCanary[], options: Options): boolean {
  const selectedLint =
    options.tier === 'slow' ? [] : lintCanaries.filter((canary) => isSelected(options, canary));
  const selectedCommands = COMMAND_CANARIES.filter(
    (canary) =>
      isSelected(options, canary) && (options.tier === null || canary.tier === options.tier),
  );
  const workspace = CanaryWorkspace.create(REPOSITORY_ROOT);
  console.log(`Planting canaries in ${workspace.root}`);
  const outcomes: CanaryOutcome[] = [];
  try {
    outcomes.push(...runLintCanaries(workspace, selectedLint));
    for (const canary of selectedCommands) outcomes.push(runCommandCanary(workspace, canary));
  } finally {
    if (!options.keepWorkspace) workspace.dispose();
  }
  for (const outcome of outcomes) console.log(renderOutcome(outcome));
  const failures = selectFailures(outcomes);
  console.log(
    `${String(outcomes.length - failures.length)} of ${String(outcomes.length)} canaries refused.`,
  );
  if (failures.length > 0) {
    console.error(
      `${String(failures.length)} gate(s) did not refuse the defect planted for them. A gate that passes its canary measures nothing.`,
    );
  }
  return failures.length === 0;
}

function main(): void {
  const options = readOptions(process.argv.slice(2));
  const lintCanaries = readLintCanaries();
  if (lintCanaries === null) {
    process.exitCode = 1;
    return;
  }
  const isInventoryComplete = isEveryGateGuarded(listMechanisms(), [
    ...lintCanaries,
    ...COMMAND_CANARIES,
  ]);
  if (!isInventoryComplete) process.exitCode = 1;
  if (options.inventoryOnly) return;
  if (!didEveryCanaryGetRefused(lintCanaries, options)) process.exitCode = 1;
}

main();
