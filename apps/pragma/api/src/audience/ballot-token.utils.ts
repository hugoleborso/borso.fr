export const BALLOT_TOKEN_BYTES = 24;

const HEXADECIMAL_RADIX = 16;
const HEXADECIMAL_DIGITS_PER_BYTE = 2;
const BALLOT_TOKEN_LENGTH = BALLOT_TOKEN_BYTES * HEXADECIMAL_DIGITS_PER_BYTE;
const BALLOT_TOKEN_PATTERN = new RegExp(`^[0-9a-f]{${BALLOT_TOKEN_LENGTH}}$`);

// @FollowsBlueprint utils-pure-module
export function mintBallotToken(randomBytes: Uint8Array): string {
  return [...randomBytes]
    .map((byte) => byte.toString(HEXADECIMAL_RADIX).padStart(HEXADECIMAL_DIGITS_PER_BYTE, '0'))
    .join('');
}

export function isWellFormedBallotToken(candidate: string): boolean {
  return BALLOT_TOKEN_PATTERN.test(candidate);
}

export function readBallotToken(headerValue: string | undefined): string | null {
  if (headerValue === undefined) return null;
  if (!isWellFormedBallotToken(headerValue)) return null;
  return headerValue;
}
