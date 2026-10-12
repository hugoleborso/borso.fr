import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

const SESSION_LIFETIME_DAYS = 30;

export const SESSION_LIFETIME_MS = SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

const sessionPayloadSchema = z.object({
  sessionId: z.string().min(1),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type SessionPayload = z.infer<typeof sessionPayloadSchema>;

export interface StoredSession {
  readonly expiresAt: Date;
}

// @FollowsBlueprint core-decision
export function buildSessionPayload(sessionId: string, nowMillis: number): SessionPayload {
  return { sessionId, issuedAt: nowMillis, expiresAt: nowMillis + SESSION_LIFETIME_MS };
}

export function parseSessionPayload(raw: string): SessionPayload | null {
  const session = sessionPayloadSchema.safeParse(parseJsonOrNull(raw));
  return session.success ? session.data : null;
}

export function isStoredSessionLive(stored: StoredSession | null, nowMillis: number): boolean {
  return stored !== null && stored.expiresAt.getTime() > nowMillis;
}
