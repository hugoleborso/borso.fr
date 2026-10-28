import { z } from 'zod';
import { studyToolInputSchema } from './studies.schema';
import {
  defineTool,
  describeOwnLine,
  readStudiesOverviewForTool,
  writeStudyForTool,
} from './studies.service';

// @FollowsBlueprint controller-dispatch
export const STUDY_TOOLS = [
  defineTool({
    name: 'get_studies_overview',
    description:
      "Read your study queue, your streak and the band's, and which songs of the next concert are ready.",
    routes: ['GET /api/studies/overview'],
    inputSchema: z.object({}),
    run: async (_input, actor) => ({
      kind: 'answered',
      body: await readStudiesOverviewForTool(actor.memberId, actor.now),
    }),
  }),
  defineTool({
    name: 'log_study',
    description:
      'Record that you worked a song on one of your instruments in its lineup today (titles, names or ids); `undo` removes today’s record.',
    routes: ['POST /api/studies', 'DELETE /api/studies/:songId/:instrumentId'],
    inputSchema: studyToolInputSchema,
    run: async ({ song, instrument, undo }, actor) => {
      const outcome = await writeStudyForTool({
        songReference: song,
        instrumentReference: instrument,
        isUndoing: undo === true,
        memberId: actor.memberId,
        now: actor.now,
      });
      if (outcome.kind !== 'ok') return { kind: 'refused', body: { error: outcome.kind } };
      return { kind: 'answered', body: describeOwnLine(outcome.myLine) };
    },
  }),
];
