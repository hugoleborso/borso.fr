import { z } from 'zod';

export const memberSessionPayloadSchema = z.object({
  memberId: z.string().uuid(),
  epoch: z.number().int().nonnegative(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type MemberSessionPayload = z.infer<typeof memberSessionPayloadSchema>;

export type MemberSessionVerdict =
  | { kind: 'valid'; memberId: string }
  | { kind: 'expired' }
  | { kind: 'stale-epoch' }
  | { kind: 'unknown-member' };

export interface KnownCredentialEpoch {
  readonly memberId: string;
  readonly sessionEpoch: number;
}

// @FollowsBlueprint core-decision
export function buildMemberSessionPayload(
  memberId: string,
  epoch: number,
  nowMillis: number,
  sessionTtlMillis: number,
): MemberSessionPayload {
  return {
    memberId,
    epoch,
    issuedAt: nowMillis,
    expiresAt: nowMillis + sessionTtlMillis,
  };
}

export function parseMemberSessionPayload(raw: string): MemberSessionPayload | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  const session = memberSessionPayloadSchema.safeParse(decoded);
  return session.success ? session.data : null;
}

export function judgeMemberSession(
  payload: MemberSessionPayload,
  credential: KnownCredentialEpoch | null,
  nowMillis: number,
): MemberSessionVerdict {
  if (nowMillis >= payload.expiresAt) return { kind: 'expired' };
  if (credential === null) return { kind: 'unknown-member' };
  if (credential.sessionEpoch !== payload.epoch) return { kind: 'stale-epoch' };
  return { kind: 'valid', memberId: payload.memberId };
}

export function nextSessionEpoch(currentEpoch: number): number {
  return currentEpoch + 1;
}
