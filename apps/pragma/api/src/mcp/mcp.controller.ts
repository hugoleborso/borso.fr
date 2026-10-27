import { Hono } from 'hono';
import { BAR_TOOLS } from '../bars/bars-tools.controller';
import { FREE_SLOT_TOOLS } from '../free-slots/free-slots-tools.controller';
import { IMPROVEMENT_TOOLS } from '../improvements/improvements-tools.controller';
import { INSTRUMENT_TOOLS } from '../instruments/instruments-tools.controller';
import { MASTERY_TOOLS } from '../mastery/mastery-tools.controller';
import { ME_TOOLS } from '../me/me-tools.controller';
import { MEMBER_TOOLS } from '../members/members-tools.controller';
import { NOTIFICATION_TOOLS } from '../notifications/notifications-tools.controller';
import { OUTREACH_TOOLS } from '../outreach/outreach-tools.controller';
import { STUDY_TOOLS } from '../studies/studies-tools.controller';
import { TASK_TOOLS } from '../tasks/tasks-tools.controller';
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
  ...TASK_TOOLS,
  ...IMPROVEMENT_TOOLS,
  ...BAR_TOOLS,
  ...OUTREACH_TOOLS,
  ...FREE_SLOT_TOOLS,
  ...STUDY_TOOLS,
  ...MASTERY_TOOLS,
  ...MEMBER_TOOLS,
  ...INSTRUMENT_TOOLS,
  ...ME_TOOLS,
  ...NOTIFICATION_TOOLS,
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
