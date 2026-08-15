/**
 * Lambda entry point. The API Gateway HTTP API forwards every request through
 * `LambdaApi`'s `$default` route to this handler.
 */

import { handle } from 'hono/aws-lambda';
import { createApp } from './app';

const app = createApp();

// @FollowsBlueprint api-lambda-entrypoint
export const handler = handle(app);
