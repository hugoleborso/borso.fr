/** @Feature auth */

export const ACCOUNT_SECTION_PARAM = 'view';
export const ACCOUNT_SECTIONS = [
  'profile',
  'sign-in',
  'calendar',
  'notifications',
  'language',
] as const;
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];
const DEFAULT_ACCOUNT_SECTION: AccountSection = 'profile';

// @FollowsBlueprint core-decision
export function readAccountSection(requested: string | null): AccountSection {
  return ACCOUNT_SECTIONS.find((section) => section === requested) ?? DEFAULT_ACCOUNT_SECTION;
}
