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

/**
 * @Blueprint api-lambda-entrypoint
 * @BlueprintName API Lambda Entrypoint
 * @BlueprintUsage Use for the Lambda handler of a Hono API. Build the app once, export the adapted handler, declare no route here.
 * @BlueprintDescription Calls `createApp` at module scope so the router is assembled during the cold start and reused by every warm invocation, then exports only the result of `handle`, which keeps the composition root the single place routes are declared.
 */
const app = createApp();

export const handler = handle(app);
