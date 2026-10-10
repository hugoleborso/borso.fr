import { handle } from 'hono/aws-lambda';
import { createApp } from './app';
import { selectErrorReportingSettings } from './helpers/observability/error-reporting.core';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';
import { startErrorReporting } from './helpers/observability/error-reporting.adapter';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

const app = createApp();

// @FollowsBlueprint api-lambda-entrypoint
export const handler = handle(app);
