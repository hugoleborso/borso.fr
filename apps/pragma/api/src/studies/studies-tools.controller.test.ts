import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { testDatabase } from '../../../test/database-utils';
import {
  type AssistantBand,
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';
import { studyTable } from './studies.schema';

const idOf = (key: string, body: unknown) =>
  z.object({ [key]: z.object({ id: z.string().uuid() }) }).parse(body)[key]?.id ?? '';
const overviewBodySchema = z.object({
  queue: z.array(
    z.object({ songId: z.string(), instrumentId: z.string(), isStudiedToday: z.boolean() }),
  ),
});

async function seedSongPlayedByHugo(band: AssistantBand) {
  const instrumentId = idOf(
    'instrument',
    (await callTool(band.assistant, 'create_instrument', { name: 'Guitar', family: 'harmonic' }))
      .body,
  );
  const otherInstrumentId = idOf(
    'instrument',
    (await callTool(band.assistant, 'create_instrument', { name: 'Voice', family: 'vocal' })).body,
  );
  const songId = idOf(
    'song',
    (
      await callTool(band.assistant, 'create_song', {
        title: 'Creep',
        status: 'idea',
        defaultLineup: { [band.hugo.memberId]: [instrumentId] },
      })
    ).body,
  );
  return { songId, instrumentId, otherInstrumentId };
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('studies tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('logs a study of today as the granting member, shows it in the overview, then undoes it', async () => {
    const band = await prepareAssistantBand();
    const { songId, instrumentId } = await seedSongPlayedByHugo(band);

    const logged = await callTool(band.assistant, 'log_study', { songId, instrumentId });
    const rows = await testDatabase()
      .select()
      .from(studyTable)
      .where(eq(studyTable.memberId, band.hugo.memberId));
    const overview = overviewBodySchema.parse(
      (await callTool(band.assistant, 'get_studies_overview')).body,
    );
    const undone = await callTool(band.assistant, 'undo_study', { songId, instrumentId });

    expect(logged.isError).toBe(false);
    expect(rows).toHaveLength(1);
    expect(overview.queue).toEqual([{ songId, instrumentId, isStudiedToday: true }]);
    expect(undone.isError).toBe(false);
    expect(await testDatabase().select().from(studyTable)).toEqual([]);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const { songId, instrumentId, otherInstrumentId } = await seedSongPlayedByHugo(band);
    const unknownId = randomUUID();

    expect(
      await callTool(band.assistant, 'log_study', { songId: unknownId, instrumentId }),
    ).toEqual(refusal('song-not-found'));
    expect(
      await callTool(band.assistant, 'log_study', { songId, instrumentId: unknownId }),
    ).toEqual(refusal('instrument-not-found'));
    expect(
      await callTool(band.assistant, 'log_study', { songId, instrumentId: otherInstrumentId }),
    ).toEqual(refusal('study-not-in-lineup'));
    expect(await callTool(band.assistant, 'undo_study', { songId, instrumentId })).toEqual(
      refusal('study-not-found'),
    );
  });
});
