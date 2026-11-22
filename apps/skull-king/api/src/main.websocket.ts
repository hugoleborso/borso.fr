import { selectErrorReportingSettings } from '@domain/error-reporting.core';
import {
  reportHandlerFailures,
  startErrorReporting,
} from './helpers/observability/error-reporting.adapter';
import { readErrorReportingInputs } from './helpers/observability/error-reporting.environment';
import { addWideEventFields, runInWideEvent } from './helpers/observability/wide-event.adapter';
import { selectRequestOutcome } from './helpers/observability/wide-event.core';
import { buildSocketReply, type SocketEvent, type SocketReply } from './realtime/realtime.service';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));

export async function answerSocketEvent(event: SocketEvent): Promise<SocketReply> {
  return await runInWideEvent(
    { 'event.kind': 'socket', 'socket.route_key': event.requestContext.routeKey },
    async () => {
      const reply = await buildSocketReply(event);
      addWideEventFields({
        'socket.status_code': reply.statusCode,
        outcome: selectRequestOutcome(reply.statusCode),
      });
      return reply;
    },
  );
}

// @FollowsBlueprint api-lambda-entrypoint
export const handler = reportHandlerFailures(answerSocketEvent);
