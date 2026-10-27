export const MEMBER_LOADING_COLOR = 'var(--color-sunk)';

const SINGLE_CHARACTER = 1;

export function memberInitial(name: string): string {
  return name.trim().slice(0, SINGLE_CHARACTER).toUpperCase();
}
