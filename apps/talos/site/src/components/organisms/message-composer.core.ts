export const LONG_MESSAGE_THRESHOLD = 6000;

// @FollowsBlueprint core-view-intent
export function isMessageTooLong(text: string): boolean {
  return text.length > LONG_MESSAGE_THRESHOLD;
}
