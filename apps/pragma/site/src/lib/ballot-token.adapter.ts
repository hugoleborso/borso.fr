/**
 * @Feature audience-voting
 * @DependsOnExternal browser-local-storage
 */

const BALLOT_KEY_PREFIX = 'pragma.ballot.';

function ballotKeyOfConcert(sessionId: string): string {
  return `${BALLOT_KEY_PREFIX}${sessionId}`;
}

export function readBallotToken(sessionId: string): string | null {
  return localStorage.getItem(ballotKeyOfConcert(sessionId));
}

export function writeBallotToken(sessionId: string, ballotToken: string): void {
  localStorage.setItem(ballotKeyOfConcert(sessionId), ballotToken);
}

export function forgetBallotToken(sessionId: string): void {
  localStorage.removeItem(ballotKeyOfConcert(sessionId));
}
