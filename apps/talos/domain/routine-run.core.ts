import { z } from 'zod';

const MESSAGE_TEXT_LIMIT = 4000;
export const RECENT_ROUTINE_RUN_LIMIT = 20;

export const messageTextSchema = z.string().trim().min(1).max(MESSAGE_TEXT_LIMIT);

// @FollowsBlueprint core-form-schema
export function canSendMessage(text: string): boolean {
  return messageTextSchema.safeParse(text).success;
}
