export const READY_DRAFT_STATUS = 'pret';
export const SENT_DRAFT_STATUS = 'envoye';
export const ABANDONED_DRAFT_STATUS = 'abandonne';

export const DRAFT_STATUS_CHANGES = [
  SENT_DRAFT_STATUS,
  ABANDONED_DRAFT_STATUS,
  READY_DRAFT_STATUS,
] as const;

export type DraftStatusChange = (typeof DRAFT_STATUS_CHANGES)[number];

const SETTLED_STATUSES: ReadonlySet<string> = new Set([SENT_DRAFT_STATUS, ABANDONED_DRAFT_STATUS]);

// @FollowsBlueprint domain-shared-selection
export function isDraftReady(status: string): boolean {
  return status === READY_DRAFT_STATUS;
}

export function isDraftStatusChangeAllowed(current: string, target: DraftStatusChange): boolean {
  if (target === READY_DRAFT_STATUS) return SETTLED_STATUSES.has(current);
  return isDraftReady(current);
}
