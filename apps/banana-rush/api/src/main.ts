import { handle } from 'hono/aws-lambda';
import { createApp } from './app';

const app = createApp();

// @FollowsBlueprint api-lambda-entrypoint
export const handler = handle(app);
