import { memberContactSchema } from '../members/members.schema';
import { studyToolInputSchema } from '../studies/studies.schema';

// @FollowsBlueprint schema-input-only
export const meUpdateToolInputSchema = memberContactSchema.extend({
  study: studyToolInputSchema.optional(),
});
