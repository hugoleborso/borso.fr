type VerdictKind = 'pass' | 'fail-local' | 'fail-plan' | 'fail-spec' | 'crash';
type RetryAction = 'fix' | 'replan' | 'escalate';

const DEFAULT_MAX_RETRIES = 3;

export function getMaxRetries(envValue: string | undefined): number {
  if (envValue === undefined || envValue === '') return DEFAULT_MAX_RETRIES;
  const parsed = Number.parseInt(envValue, 10);
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_MAX_RETRIES;
  return parsed;
}

export function nextAction(
  retries: number,
  verdictKind: VerdictKind,
  maxRetries: number,
): RetryAction {
  if (retries >= maxRetries) return 'escalate';
  if (verdictKind === 'fail-spec') return 'escalate';
  if (verdictKind === 'crash') return 'escalate';
  if (verdictKind === 'fail-plan') return 'replan';
  return 'fix';
}
