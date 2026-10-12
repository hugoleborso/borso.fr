export const MEMBER_COLOR_TOKENS = {
  coral: 'var(--color-member-coral)',
  teal: 'var(--color-member-teal)',
  mustard: 'var(--color-member-mustard)',
  plum: 'var(--color-member-plum)',
  sage: 'var(--color-member-sage)',
} as const;

const SINGLE_CHARACTER = 1;

export function memberInitial(name: string): string {
  return name.trim().slice(0, SINGLE_CHARACTER).toUpperCase();
}
