import { handle } from '@hono/aws-lambda';
import { createApp } from './app';
import {
  reportHandlerFailures,
  startErrorReporting,
} from './helpers/observability/error-reporting.adapter';
import { selectApiErrorReportingSettings } from './helpers/observability/error-reporting.core';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';

startErrorReporting(selectApiErrorReportingSettings(readErrorReportingInputs()));

const app = createApp();

// @FollowsBlueprint api-lambda-entrypoint
export const handler = reportHandlerFailures(handle(app));
