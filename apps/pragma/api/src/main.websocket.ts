import { addWideEventFields, runInWideEvent } from './helpers/observability/wide-event.adapter';
import { selectRequestOutcome } from './helpers/observability/wide-event.core';
import { buildSocketReply, type SocketEvent, type SocketReply } from './realtime/realtime.service';

// @FollowsBlueprint api-lambda-entrypoint
export const handler = async (event: SocketEvent): Promise<SocketReply> =>
  await runInWideEvent(
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
