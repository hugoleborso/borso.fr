/**
 * @Feature audience-voting
 * @DependsOnExternal browser-local-storage
 */

const BALLOT_KEY_PREFIX = 'pragma.ballot.';

function ballotKeyOfConcert(sessionId: string): string {
  return `${BALLOT_KEY_PREFIX}${sessionId}`;
}

/**
 * @Blueprint adapter-storage-keyed-by-record
 * @BlueprintName Local Storage Keyed By The Record It Belongs To
 * @BlueprintUsage Use when the browser has to remember one value per record rather than one value for the whole application.
 * @BlueprintDescription Builds the key from a prefix and the record's identifier in one private function every read and write calls, so the two can never disagree and a second record is a second entry rather than an overwrite. The value is whatever the server minted and nothing derived from the person or the device, which is what keeps the stored token an identifier for a browser rather than a fingerprint. It exports a `forget` alongside the read and the write, because the value can stop being valid on the server and the browser has to be able to drop it.
 */
export function readBallotToken(sessionId: string): string | null {
  return localStorage.getItem(ballotKeyOfConcert(sessionId));
}

export function writeBallotToken(sessionId: string, ballotToken: string): void {
  localStorage.setItem(ballotKeyOfConcert(sessionId), ballotToken);
}

export function forgetBallotToken(sessionId: string): void {
  localStorage.removeItem(ballotKeyOfConcert(sessionId));
}
