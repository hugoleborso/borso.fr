import { describe, expect, it } from 'vitest';
import {
  BALLOT_TOKEN_BYTES,
  isWellFormedBallotToken,
  mintBallotToken,
  readBallotToken,
} from './ballot-token.utils';

const HEXADECIMAL_DIGITS_PER_BYTE = 2;
const TOKEN_LENGTH = BALLOT_TOKEN_BYTES * HEXADECIMAL_DIGITS_PER_BYTE;

// @FollowsBlueprint test-pure-unit
describe('minting a ballot token', () => {
  it('encodes every byte it was handed as two lowercase hexadecimal digits', () => {
    expect(mintBallotToken(Uint8Array.from([0, 15, 16, 255]))).toBe('000f10ff');
  });

  it('produces a token of the declared length from the declared number of bytes', () => {
    const token = mintBallotToken(new Uint8Array(BALLOT_TOKEN_BYTES).fill(1));
    expect(token).toHaveLength(TOKEN_LENGTH);
    expect(isWellFormedBallotToken(token)).toBe(true);
  });

  it('reads two different byte sequences back as two different ballots', () => {
    const one = mintBallotToken(new Uint8Array(BALLOT_TOKEN_BYTES).fill(1));
    const other = mintBallotToken(new Uint8Array(BALLOT_TOKEN_BYTES).fill(2));
    expect(one).not.toBe(other);
  });
});

describe('recognising a ballot token', () => {
  it('refuses a token that is too short, too long, or not hexadecimal', () => {
    expect(isWellFormedBallotToken('a'.repeat(TOKEN_LENGTH - 1))).toBe(false);
    expect(isWellFormedBallotToken('a'.repeat(TOKEN_LENGTH + 1))).toBe(false);
    expect(isWellFormedBallotToken('z'.repeat(TOKEN_LENGTH))).toBe(false);
  });

  it('refuses an empty string, which is what an absent header reads as', () => {
    expect(isWellFormedBallotToken('')).toBe(false);
  });
});

describe('reading the ballot token off a request', () => {
  it('answers nothing when the header is absent', () => {
    expect(readBallotToken(undefined)).toBe(null);
  });

  it('answers nothing when the header carries a token this server never minted', () => {
    expect(readBallotToken('not-a-ballot')).toBe(null);
  });

  it('answers the token when the header carries one of ours', () => {
    const token = mintBallotToken(new Uint8Array(BALLOT_TOKEN_BYTES).fill(7));
    expect(readBallotToken(token)).toBe(token);
  });
});
