const SUBJECT_LENGTH_LIMIT = 200;

// @FollowsBlueprint core-projection
export function cutMessageSubject(message: string): string {
  return Array.from(message).slice(0, SUBJECT_LENGTH_LIMIT).join('');
}
