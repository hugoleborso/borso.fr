const FIRST_SUFFIX = 2;

export interface EnrolmentCandidate {
  readonly memberId: string;
  readonly firstName: string;
}

export type EnrolmentWindow =
  { kind: 'open'; candidates: readonly EnrolmentCandidate[] } | { kind: 'closed' };

// @FollowsBlueprint core-decision
export function selectEnrolmentWindow(
  members: readonly EnrolmentCandidate[],
  enrolledMemberIds: readonly string[],
): EnrolmentWindow {
  const enrolled = new Set(enrolledMemberIds);
  const candidates = members.filter((member) => !enrolled.has(member.memberId));
  if (candidates.length === 0) return { kind: 'closed' };
  return { kind: 'open', candidates };
}

export function suggestUsername(firstName: string, takenUsernames: readonly string[]): string {
  const base = firstName
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/gu, '')
    .replaceAll(/[^a-z0-9]/gu, '');
  const taken = new Set(takenUsernames);
  if (!taken.has(base)) return base;
  let suffix = FIRST_SUFFIX;
  while (taken.has(`${base}${String(suffix)}`)) suffix += 1;
  return `${base}${String(suffix)}`;
}
