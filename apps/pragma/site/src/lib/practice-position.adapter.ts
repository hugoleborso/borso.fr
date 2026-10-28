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

export function writePracticePosition(sessionId: string, position: string): void {
  try {
    localStorage.setItem(practiceKeyOfSession(sessionId), position);
  } catch {
    return;
  }
}

export function forgetPracticePosition(sessionId: string): void {
  try {
    localStorage.removeItem(practiceKeyOfSession(sessionId));
  } catch {
    return;
  }
}
