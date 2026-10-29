/**
 * @Feature practice-mode
 * @DependsOnExternal browser-local-storage
 */

const PRACTICE_KEY_PREFIX = 'pragma.practice.';

function practiceKeyOfSession(sessionId: string): string {
  return `${PRACTICE_KEY_PREFIX}${sessionId}`;
}

// @FollowsBlueprint adapter-storage-keyed-by-record
export function readStoredPracticePosition(sessionId: string): string | null {
  try {
    return localStorage.getItem(practiceKeyOfSession(sessionId));
  } catch {
    return null;
  }
}

// Stryker disable BlockStatement: equivalent mutant. An empty catch block swallows the storage refusal exactly as this one does.
function ignoringStorageRefusal(write: () => void): void {
  try {
    write();
  } catch {
    return;
  }
}
// Stryker restore BlockStatement

export function writePracticePosition(sessionId: string, position: string): void {
  ignoringStorageRefusal(() => localStorage.setItem(practiceKeyOfSession(sessionId), position));
}

export function forgetPracticePosition(sessionId: string): void {
  ignoringStorageRefusal(() => localStorage.removeItem(practiceKeyOfSession(sessionId)));
}
