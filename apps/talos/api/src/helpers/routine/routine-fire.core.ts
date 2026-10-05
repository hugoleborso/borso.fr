export type RoutineTrigger = 'proposition' | 'message';

export type FireOutcome =
  | { readonly kind: 'fired' }
  | { readonly kind: 'skipped' }
  | { readonly kind: 'failed'; readonly status: number };

const ROUTINE_BETA_HEADER = 'experimental-cc-routine-2026-04-01';
const ANTHROPIC_VERSION = '2023-06-01';
const FIRST_SUCCESS_STATUS = 200;
const FIRST_REDIRECT_STATUS = 300;

export function buildFireHeaders(token: string | undefined): Record<string, string> {
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'anthropic-beta': ROUTINE_BETA_HEADER,
    'anthropic-version': ANTHROPIC_VERSION,
    'Content-Type': 'application/json',
  };
}

// @FollowsBlueprint core-template-rendering
export function buildFireBody(
  secretPhrase: string | undefined,
  trigger: RoutineTrigger,
  path: string,
): string {
  return JSON.stringify({ text: `${secretPhrase ?? ''}\n${trigger}: ${path}` });
}

export function readFireOutcome(status: number): FireOutcome {
  const isSuccess = status >= FIRST_SUCCESS_STATUS && status < FIRST_REDIRECT_STATUS;
  return isSuccess ? { kind: 'fired' } : { kind: 'failed', status };
}
