import { z } from 'zod';

export const MESSAGE_TEXT_LIMIT = 4000;
export const RECENT_ROUTINE_RUN_LIMIT = 20;
const NUL_CHARACTER = '\u0000';

export const messageTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(MESSAGE_TEXT_LIMIT)
  .refine((text) => !text.includes(NUL_CHARACTER));

// @FollowsBlueprint core-form-schema
export function canSendMessage(text: string): boolean {
  return messageTextSchema.safeParse(text).success;
}
