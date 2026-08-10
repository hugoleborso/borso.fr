import { z } from 'zod';

const TWO_DIGITS = 2;

function padTwoDigits(value: number): string {
  return `${value}`.padStart(TWO_DIGITS, '0');
}

/** An instant as the `datetime-local` input reads it, in local wall time. */
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

/**
 * Suggest the next edition's slug. If the current edition slug ends in a
 * 4-digit year (`lepin-2026`), increment it (`lepin-2027`). Otherwise
 * append `-next` so the suggestion never collides with the existing slug.
 */
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

/**
 * Pull a human-readable summary out of a `zValidator` 400 body. Hono's
 * default error shape is `{ success: false, error: { issues: [...] } }`
 * — surface the path + message of each issue so the operator sees which
 * field actually failed instead of a generic "données invalides" hint.
 */
export function summariseZodError(body: unknown): string | null {
  const parsed = zodValidationErrorSchema.safeParse(body);
  if (!parsed.success) return null;
  return parsed.data.error.issues
    .map((issue) => `${(issue.path ?? []).join('.') || '?'}: ${issue.message ?? 'invalide'}`)
    .join(' · ');
}
