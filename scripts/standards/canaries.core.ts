export type MechanismKind = 'eslint' | 'script' | 'generator' | 'gate' | 'test' | 'types';

export interface Mechanism {
  readonly kind: MechanismKind;
  readonly target: string;
}

export interface CanaryEdit {
  readonly path: string;
  readonly find: string;
  readonly replace: string;
}

export type CanaryTier = 'fast' | 'slow';

export interface CommandCanary {
  readonly mechanism: string;
  readonly label: string;
  readonly defect: string;
  readonly plant?: Readonly<Record<string, string>>;
  readonly edits?: readonly CanaryEdit[];
  readonly stage?: boolean;
  readonly command: readonly string[];
  readonly environment?: Readonly<Record<string, string>>;
  readonly refusal: RegExp;
  readonly tier: CanaryTier;
}

export interface LintCanary {
  readonly mechanism: string;
  readonly label: string;
  readonly path: string;
  readonly code: string;
}

export type CanaryVerdict = 'refused' | 'passed' | 'refused-for-another-reason' | 'broken';

export interface CanaryOutcome {
  readonly mechanism: string;
  readonly label: string;
  readonly verdict: CanaryVerdict;
  readonly detail: string;
}

export interface RunResult {
  readonly exitCode: number;
  readonly output: string;
}

const GENERATOR_CHECK_PATTERN = /(?<=tsx\s+"?)[\w./-]+\.ts(?="?\s+--check\b)/g;
const EVIDENCE_LINES = 12;

function isMechanismKind(kind: string): kind is MechanismKind {
  return ['eslint', 'script', 'generator', 'gate', 'test', 'types'].includes(kind);
}

export function collectMechanisms(
  citations: readonly { readonly kind: string; readonly target: string }[],
): readonly Mechanism[] {
  const byTarget = new Map<string, Mechanism>();
  for (const citation of citations) {
    if (!isMechanismKind(citation.kind)) continue;
    if (!byTarget.has(citation.target)) {
      byTarget.set(citation.target, { kind: citation.kind, target: citation.target });
    }
  }
  return [...byTarget.values()].sort((left, right) => left.target.localeCompare(right.target));
}

export function listCheckedGenerators(siteTexts: readonly string[]): readonly string[] {
  const generators = siteTexts.flatMap((text) =>
    [...text.matchAll(GENERATOR_CHECK_PATTERN)].map((match) => match[0]),
  );
  return [...new Set(generators)].sort();
}

export function selectUnguardedMechanisms(
  mechanisms: readonly Mechanism[],
  guardedTargets: ReadonlySet<string>,
): readonly Mechanism[] {
  return mechanisms.filter((mechanism) => !guardedTargets.has(mechanism.target));
}

export function selectStrayCanaries(
  canaryTargets: readonly string[],
  mechanisms: readonly Mechanism[],
): readonly string[] {
  const known = new Set(mechanisms.map((mechanism) => mechanism.target));
  return [...new Set(canaryTargets)].filter((target) => !known.has(target)).sort();
}

function summariseOutput(output: string): string {
  return output.trim().split('\n').slice(-EVIDENCE_LINES).join('\n');
}

export function judgeCommandRun(
  result: RunResult,
  refusal: RegExp,
): Omit<CanaryOutcome, 'mechanism' | 'label'> {
  if (result.exitCode === 0) {
    return { verdict: 'passed', detail: summariseOutput(result.output) };
  }
  if (refusal.test(result.output)) {
    return { verdict: 'refused', detail: `exit ${String(result.exitCode)}` };
  }
  return {
    verdict: 'refused-for-another-reason',
    detail: `exit ${String(result.exitCode)} without ${String(refusal)}:\n${summariseOutput(result.output)}`,
  };
}

export function judgeLintRun(
  reportedRules: readonly (string | null)[],
  rule: string,
  fatalMessages: readonly string[],
): Omit<CanaryOutcome, 'mechanism' | 'label'> {
  if (reportedRules.includes(rule)) return { verdict: 'refused', detail: 'reported' };
  if (fatalMessages.length > 0) {
    return { verdict: 'refused-for-another-reason', detail: fatalMessages.join('\n') };
  }
  const others = reportedRules.filter((reported) => reported !== null);
  return {
    verdict: 'passed',
    detail:
      others.length > 0 ? `reported only ${[...new Set(others)].join(', ')}` : 'reported nothing',
  };
}

export function selectFailures(outcomes: readonly CanaryOutcome[]): readonly CanaryOutcome[] {
  return outcomes.filter((outcome) => outcome.verdict !== 'refused');
}

const VERDICT_HEADLINES: Readonly<Record<CanaryVerdict, string>> = {
  refused: 'refused',
  passed: 'PASSED A PLANTED DEFECT',
  'refused-for-another-reason': 'failed, but not on the planted defect',
  broken: 'canary could not be planted',
};

export function renderOutcome(outcome: CanaryOutcome): string {
  const headline = `${VERDICT_HEADLINES[outcome.verdict]}: ${outcome.label} (${outcome.mechanism})`;
  if (outcome.verdict === 'refused') return headline;
  const indented = outcome.detail
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `${headline}\n${indented}`;
}
