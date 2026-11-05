import { selectErrorReportingSettings } from '@domain/error-reporting.core';
import { handle } from 'hono/aws-lambda';
import { createApp } from './app';
import { startErrorReporting } from './helpers/observability/error-reporting.adapter';
import { readErrorReportingDsn } from './helpers/observability/error-reporting.environment';

startErrorReporting(selectErrorReportingSettings(readErrorReportingDsn()));

const app = createApp();

// @FollowsBlueprint api-lambda-entrypoint
export const handler = handle(app);
