import { Hono } from 'hono';
import { BAR_DELETION, BAR_TOOLS } from '../bars/bars-tools.controller';
import { FREE_SLOT_TOOLS } from '../free-slots/free-slots-tools.controller';
import {
  IMPROVEMENT_DELETION,
  IMPROVEMENT_TOOLS,
} from '../improvements/improvements-tools.controller';
import { INSTRUMENT_TOOLS } from '../instruments/instruments-tools.controller';
import { ME_TOOLS } from '../me/me-tools.controller';
import { MEMBER_TOOLS } from '../members/members-tools.controller';
import { TASK_DELETION, TASK_TOOLS } from '../tasks/tasks-tools.controller';
import { readMemberId } from '../auth/member-session.middleware';
import { requireBearerSession } from '../oauth/bearer-session.middleware';
import { SESSION_DELETION, SESSION_TOOLS } from '../sessions/sessions-tools.controller';
import { SETLIST_DELETION, SETLIST_TOOLS } from '../setlists/setlists-tools.controller';
import { SONG_DELETION, SONG_TOOLS } from '../songs/songs-tools.controller';
import { TAKE_DELETION, TAKE_TOOLS } from '../takes/takes-tools.controller';
import {
  answerToolRequest,
  defineDeletionTool,
  reportToolFailureToErrorTracking,
  type ToolDefinition,
} from './mcp.service';

const METHOD_NOT_ALLOWED_STATUS = 405;
const STATELESS_METHODS_REFUSED = ['GET', 'DELETE'];
const ALLOWED_METHODS_HEADER = { Allow: 'POST' };

const DELETION_TOOL = defineDeletionTool({
  name: 'delete',
  description:
    'Delete one bar, improvement, session, setlist, song, take or task, by id (or name). Irreversible: confirm with the user first.',
  kinds: ['bar', 'improvement', 'session', 'setlist', 'song', 'take', 'task'],
  deletions: {
    bar: BAR_DELETION,
    improvement: IMPROVEMENT_DELETION,
    session: SESSION_DELETION,
    setlist: SETLIST_DELETION,
    song: SONG_DELETION,
    take: TAKE_DELETION,
    task: TASK_DELETION,
  },
});

export const ASSISTANT_TOOLS: readonly ToolDefinition[] = [
  ...SESSION_TOOLS,
  ...SETLIST_TOOLS,
  ...SONG_TOOLS,
  ...TAKE_TOOLS,
  ...MEMBER_TOOLS,
  ...INSTRUMENT_TOOLS,
  ...BAR_TOOLS,
  ...IMPROVEMENT_TOOLS,
  ...TASK_TOOLS,
  ...FREE_SLOT_TOOLS,
  ...ME_TOOLS,
  DELETION_TOOL,
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
