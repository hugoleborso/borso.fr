import { z } from 'zod';

export function isoLocal(date: Date): string {
  const pad = (value: number): string => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultStartsAt(now: Date = new Date()): string {
  const cursor = new Date(now);
  cursor.setHours(6, 0, 0, 0);
  return isoLocal(cursor);
}

export function defaultEndsAt(now: Date = new Date()): string {
  const cursor = new Date(now);
  cursor.setHours(22, 0, 0, 0);
  return isoLocal(cursor);
}

/**
 * Suggest the next edition's slug. If the current edition slug ends in a
 * 4-digit year (`lepin-2026`), increment it (`lepin-2027`). Otherwise
 * append `-next` so the suggestion never collides with the existing slug.
 */
export function suggestNextSlug(currentSlug: string | undefined): string {
  if (currentSlug === undefined) return 'lepin-2026';
  const match = /^(.*?)(\d{4})$/.exec(currentSlug);
  if (match !== null) {
    const stem = match[1] ?? '';
    const year = Number.parseInt(match[2] ?? '0', 10);
    return `${stem}${year + 1}`;
  }
  return `${currentSlug}-next`;
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
