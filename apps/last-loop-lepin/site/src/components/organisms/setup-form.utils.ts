import { z } from 'zod';

const TWO_DIGITS = 2;

function padTwoDigits(value: number): string {
  return `${value}`.padStart(TWO_DIGITS, '0');
}

// @FollowsBlueprint utils-pure-module
export function isoLocal(date: Date): string {
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());
  const hours = padTwoDigits(date.getHours());
  const minutes = padTwoDigits(date.getMinutes());
  return `${date.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
}

const FIRST_EDITION_SLUG = 'lepin-2026';
const TRAILING_YEAR = /\d{4}$/;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;

export function defaultStartsAt(now: Date): string {
  const cursor = new Date(now);
  cursor.setHours(DEFAULT_START_HOUR, 0, 0, 0);
  return isoLocal(cursor);
}

export function defaultEndsAt(now: Date): string {
  const cursor = new Date(now);
  cursor.setHours(DEFAULT_END_HOUR, 0, 0, 0);
  return isoLocal(cursor);
}

export function suggestNextSlug(currentSlug: string | undefined): string {
  if (currentSlug === undefined) return FIRST_EDITION_SLUG;
  const match = TRAILING_YEAR.exec(currentSlug);
  if (match === null) return `${currentSlug}-next`;
  const year = Number.parseInt(match[0], 10);
  return `${currentSlug.slice(0, match.index)}${year + 1}`;
}

const zodValidationErrorSchema = z.object({
  error: z.object({
    issues: z
      .array(
        z.object({
          path: z.array(z.union([z.string(), z.number()])).optional(),
          message: z.string().optional(),
        }),
      )
      .min(1),
  }),
});

// @FollowsBlueprint core-parse-untrusted
export function summariseZodError(body: unknown): string | null {
  const validationError = zodValidationErrorSchema.safeParse(body);
  if (!validationError.success) return null;
  return validationError.data.error.issues
    .map((issue) => `${(issue.path ?? []).join('.') || '?'}: ${issue.message ?? 'invalide'}`)
    .join(' · ');
}
