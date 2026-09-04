import { beforeEach, describe, expect, it } from 'vitest';
import { forgetBallotToken, readBallotToken, writeBallotToken } from './ballot-token.adapter';

const ONE_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const ANOTHER_CONCERT = 'bbbbbbbb-2222-4222-8222-222222222222';

describe('the ballot token this browser holds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is absent at a concert this browser has never voted at', () => {
    expect(readBallotToken(ONE_CONCERT)).toBe(null);
  });

  it('reads back the token the server minted', () => {
    writeBallotToken(ONE_CONCERT, 'abc123');
    expect(readBallotToken(ONE_CONCERT)).toBe('abc123');
  });

  it('is keyed by concert, so a visitor at a second concert is a second ballot', () => {
    writeBallotToken(ONE_CONCERT, 'abc123');
    writeBallotToken(ANOTHER_CONCERT, 'def456');
    expect(readBallotToken(ONE_CONCERT)).toBe('abc123');
    expect(readBallotToken(ANOTHER_CONCERT)).toBe('def456');
  });

  it('is gone once forgotten, which is what an unknown token leads to', () => {
    writeBallotToken(ONE_CONCERT, 'abc123');
    forgetBallotToken(ONE_CONCERT);
    expect(readBallotToken(ONE_CONCERT)).toBe(null);
  });
});
