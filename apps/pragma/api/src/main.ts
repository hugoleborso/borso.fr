/**
 * Lambda entry point. API Gateway HTTP API forwards every request
 * through `LambdaApi`'s `$default` route to this handler.
 */

import { handle } from 'hono/aws-lambda';
import { createApp } from './app';

const app = createApp();

export const handler = handle(app);
