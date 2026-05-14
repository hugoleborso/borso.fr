/**
 * Lambda entry point. API Gateway HTTP API forwards every request through
 * `LambdaApi`'s `$default` route to this handler.
 *
 * We use Hono's APIGW v2 handler (`hono/aws-lambda`'s `handle`). The spec
 * mentioned `awslambda.streamify` for streaming responses, but the
 * `LambdaApi` construct backs the function with API Gateway HTTP API,
 * which does not support end-to-end response streaming. The 2 s polling
 * cadence in the spec is well within `handle`'s capabilities — streaming
 * is parked as a future infra refactor (LambdaApi → Lambda Function URL
 * with RESPONSE_STREAM invoke mode), out of scope for this PR.
 */

import { handle } from 'hono/aws-lambda';
import { createApp } from './app';

const app = createApp();

export const handler = handle(app);
