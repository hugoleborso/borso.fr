/**
 * Where the sign-in screen sends the visitor once the password is
 * accepted: back to the page the route guard bounced them from, or the
 * catalog when they arrived at /login directly.
 */

import { z } from 'zod';

export const DEFAULT_POST_LOGIN_PATH = '/catalog';

const locationStateSchema = z.object({ from: z.string().min(1) }).partial();

export function selectPostLoginPath(locationState: unknown): string {
  const parsed = locationStateSchema.safeParse(locationState);
  if (!parsed.success) return DEFAULT_POST_LOGIN_PATH;
  return parsed.data.from ?? DEFAULT_POST_LOGIN_PATH;
}
