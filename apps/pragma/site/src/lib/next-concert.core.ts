/** @Feature sessions */

export const MEMBER_FILTER_PARAM = 'member';

export function buildMemberSetlistPath(setlistId: string, memberId: string): string {
  if (memberId === '') return `/setlists/${setlistId}`;
  const query = new URLSearchParams({ [MEMBER_FILTER_PARAM]: memberId });
  return `/setlists/${setlistId}?${query.toString()}`;
}
