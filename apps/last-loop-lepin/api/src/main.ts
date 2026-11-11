import { handle } from 'hono/aws-lambda';
import { createApp } from './app';
import { startErrorReporting } from './helpers/observability/error-reporting.adapter';
import { selectErrorReportingSettings } from './helpers/observability/error-reporting.core';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';

/**
 * @Blueprint api-lambda-entrypoint
 * @BlueprintName API Lambda Entrypoint
 * @BlueprintUsage Use for the Lambda handler of a Hono API. Build the app once, export the adapted handler, declare no route here.
 * @BlueprintDescription Calls `createApp` at module scope so the router is assembled during the cold start and reused by every warm invocation, then exports only the result of `handle`, which keeps the composition root the single place routes are declared.
 */
startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

const app = createApp();

export const handler = handle(app);
