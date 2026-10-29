import { handle, type LambdaContext, type LambdaEvent } from 'hono/aws-lambda';
import { createApp } from './app';
import {
  isStreakReminderEvent,
  type StreakReminderEvent,
} from './helpers/lambda-event/lambda-event.core';
import { selectErrorReportingSettings } from './helpers/observability/error-reporting.core';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';
import {
  flushErrorReports,
  reportUnhandledError,
  startErrorReporting,
} from './helpers/observability/error-reporting.adapter';
import { runStreakReminder } from './streaks/streak-reminder.service';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

const app = createApp();

const httpHandler = handle(app);

async function runScheduledStreakReminder(now: Date): Promise<void> {
  try {
    await runStreakReminder(now);
  } catch (error) {
    reportUnhandledError(error);
    throw error;
  } finally {
    await flushErrorReports();
  }
}

// @FollowsBlueprint api-lambda-entrypoint
export const handler = async (
  event: LambdaEvent | StreakReminderEvent,
  lambdaContext?: LambdaContext,
) => {
  const isScheduledStreakReminder = isStreakReminderEvent(event);
  if (isScheduledStreakReminder) {
    await runScheduledStreakReminder(new Date());
    return;
  }
  return await httpHandler(event, lambdaContext);
};
