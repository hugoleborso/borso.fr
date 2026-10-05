import type { MiddlewareHandler } from 'hono';
import { authorizeNotifier } from './notify.service';

// @FollowsBlueprint middleware-session-gate
export const requireNotifySecret: MiddlewareHandler = async (context, next) => {
  await authorizeNotifier(context.req.header('authorization'));
  await next();
};
