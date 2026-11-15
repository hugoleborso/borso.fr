import { memberContactSchema } from '../members/members.schema';

// @FollowsBlueprint schema-input-only
export const meUpdateToolInputSchema = memberContactSchema.strict();
