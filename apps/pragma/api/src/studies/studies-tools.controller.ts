import { z } from 'zod';
import { studyLogSchema, studyPathSchema } from './studies.schema';
import { defineTool, logStudy, readStudiesOverview, undoStudy } from './studies.service';

// @FollowsBlueprint controller-dispatch
export const STUDY_TOOLS = [
  defineTool({
    name: 'get_studies_overview',
    description:
      "Read your study queue, your streak and the band's streaks, and the readiness of the next concert.",
    route: 'GET /api/studies/overview',
    inputSchema: z.object({}),
    run: async (_input, actor) => ({
      kind: 'answered',
      body: await readStudiesOverview(actor.memberId, actor.now),
    }),
  }),
  defineTool({
    name: 'log_study',
    description:
      'Record that you worked the song `songId` on the instrument `instrumentId` today. The instrument must be yours in a lineup of the song; a second call on the same day changes nothing.',
    route: 'POST /api/studies',
    inputSchema: studyLogSchema,
    run: async (input, actor) => {
      const outcome = await logStudy({ ...input, memberId: actor.memberId, now: actor.now });
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { study: outcome.study, myLine: outcome.myLine } };
    },
  }),
  defineTool({
    name: 'undo_study',
    description:
      'Remove the study you recorded today for the song `songId` on the instrument `instrumentId`.',
    route: 'DELETE /api/studies/:songId/:instrumentId',
    inputSchema: studyPathSchema,
    run: async (input, actor) => {
      const outcome = await undoStudy({ ...input, memberId: actor.memberId, now: actor.now });
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: { myLine: outcome.myLine } };
    },
  }),
];
