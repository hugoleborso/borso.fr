import { handle, type LambdaContext, type LambdaEvent } from '@hono/aws-lambda';
import { createApp } from './app';
import { selectErrorReportingSettings } from './helpers/observability/error-reporting.core';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';
import {
  flushErrorReports,
  startErrorReporting,
} from './helpers/observability/error-reporting.adapter';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

const app = createApp();

const httpHandler = handle(app);

// @FollowsBlueprint api-lambda-entrypoint
export const handler = async (event: LambdaEvent, lambdaContext?: LambdaContext) => {
  try {
    return await httpHandler(event, lambdaContext);
  } finally {
    await flushErrorReports();
  }
};
