import { z } from 'zod';

export const ROUTINE_TRIGGERS = ['proposition', 'message'] as const;

export type RoutineTrigger = (typeof ROUTINE_TRIGGERS)[number];

export type FireOutcome =
  | { readonly kind: 'fired'; readonly sessionUrl: string | null }
  | { readonly kind: 'skipped' }
  | { readonly kind: 'failed'; readonly status: number };

const ROUTINE_BETA_HEADER = 'experimental-cc-routine-2026-04-01';
const ANTHROPIC_VERSION = '2023-06-01';
const FIRST_SUCCESS_STATUS = 200;
const FIRST_REDIRECT_STATUS = 300;
const CLAUDE_CODE_ADDRESS_PATTERN = /^https:\/\/claude\.ai\/code\/[\w/-]+$/;
const MAXIMUM_ADDRESS_LENGTH = 300;

const fireAnswerSchema = z.object({
  claude_code_session_url: z
    .string()
    .max(MAXIMUM_ADDRESS_LENGTH)
    .regex(CLAUDE_CODE_ADDRESS_PATTERN),
});

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
  subject: string,
): string {
  return JSON.stringify({ text: `${secretPhrase ?? ''}\n${trigger}: ${subject}` });
}

// @FollowsBlueprint core-parse-untrusted
export function readSessionUrl(answer: unknown): string | null {
  const addressedAnswer = fireAnswerSchema.safeParse(answer);
  return addressedAnswer.success ? addressedAnswer.data.claude_code_session_url : null;
}

export function readFireOutcome(status: number, answer: unknown): FireOutcome {
  const isSuccess = status >= FIRST_SUCCESS_STATUS && status < FIRST_REDIRECT_STATUS;
  return isSuccess
    ? { kind: 'fired', sessionUrl: readSessionUrl(answer) }
    : { kind: 'failed', status };
}
