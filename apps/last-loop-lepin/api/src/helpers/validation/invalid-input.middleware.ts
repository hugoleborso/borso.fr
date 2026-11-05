import type { Context } from 'hono';
import type { core } from 'zod';

const BAD_REQUEST_STATUS = 400;

export type ValidationResult =
  | { readonly success: true }
  | { readonly success: false; readonly error: { readonly issues: readonly core.$ZodIssue[] } };

export function answerInvalidInput(
  result: ValidationResult,
  context: Context,
): Response | undefined {
  if (result.success) return undefined;
  return context.json(
    { success: false, error: { issues: result.error.issues } },
    BAD_REQUEST_STATUS,
  );
}
