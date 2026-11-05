import { selectErrorReportingSettings } from '@domain/error-reporting.core';
import {
  reportHandlerFailures,
  startErrorReporting,
} from './helpers/observability/error-reporting.adapter';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';
import { buildSocketReply } from './realtime/realtime.service';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

// @FollowsBlueprint api-lambda-entrypoint
export const handler = reportHandlerFailures(buildSocketReply);
