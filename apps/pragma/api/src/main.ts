import { handle, type LambdaContext, type LambdaEvent } from 'hono/aws-lambda';
import { createApp } from './app';
import { getAppConfig } from './auth/auth.service';
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
import { runInWideEvent } from './helpers/observability/wide-event.adapter';
import { runStreakReminder } from './streaks/streak-reminder.service';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

const app = createApp();

const warmUpStartedAt = performance.now();
const warmUpOutcome = await getAppConfig().then(
  () => 'connected',
  () => 'failed',
);
process.stdout.write(
  `${JSON.stringify({ probe: 'init.warm_up', outcome: warmUpOutcome, duration_ms: Math.round(performance.now() - warmUpStartedAt), since_process_start_ms: Math.round(performance.now()) })}\n`,
);

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
    await runInWideEvent({ 'event.kind': 'scheduled', 'scheduled.job': 'streak-reminder' }, () =>
      runScheduledStreakReminder(new Date()),
    );
    return;
  }
  try {
    return await httpHandler(event, lambdaContext);
  } finally {
    await flushErrorReports();
  }
};
