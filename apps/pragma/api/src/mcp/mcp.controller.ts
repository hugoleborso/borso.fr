import { Hono } from 'hono';
import { readMemberId } from '../auth/member-session.middleware';
import { requireBearerSession } from '../oauth/bearer-session.middleware';
import { SESSION_TOOLS } from '../sessions/sessions-tools.controller';
import { SETLIST_TOOLS } from '../setlists/setlists-tools.controller';
import { SONG_TOOLS } from '../songs/songs-tools.controller';
import { TAKE_TOOLS } from '../takes/takes-tools.controller';
import { TRANSITION_TOOLS } from '../transitions/transitions-tools.controller';
import {
  answerToolRequest,
  reportToolFailureToErrorTracking,
  type ToolDefinition,
} from './mcp.service';

const METHOD_NOT_ALLOWED_STATUS = 405;
const STATELESS_METHODS_REFUSED = ['GET', 'DELETE'];
const ALLOWED_METHODS_HEADER = { Allow: 'POST' };

export const ASSISTANT_TOOLS: readonly ToolDefinition[] = [
  ...SONG_TOOLS,
  ...TRANSITION_TOOLS,
  ...SESSION_TOOLS,
  ...SETLIST_TOOLS,
  ...TAKE_TOOLS,
];

export interface BuildMcpRouterOptions {
  readonly clock?: () => Date;
  readonly reportFailure?: typeof reportToolFailureToErrorTracking;
}

// @FollowsBlueprint controller-dispatch
export function buildMcpRouter(options: BuildMcpRouterOptions = {}) {
  const clock = options.clock ?? (() => new Date());
  const reportFailure = options.reportFailure ?? reportToolFailureToErrorTracking;
  return new Hono()
    .post('/', requireBearerSession(clock), async (context) => {
      return await answerToolRequest(context, {
        tools: ASSISTANT_TOOLS,
        actor: { memberId: readMemberId(context), now: clock() },
        reportFailure,
      });
    })
    .on(STATELESS_METHODS_REFUSED, '/', (context) =>
      context.json(
        { error: 'method-not-allowed' },
        METHOD_NOT_ALLOWED_STATUS,
        ALLOWED_METHODS_HEADER,
      ),
    );
}
