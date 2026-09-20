import { buildSocketReply } from './realtime/realtime.service';

// @FollowsBlueprint api-lambda-entrypoint
export const handler = buildSocketReply;
