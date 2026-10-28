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

const idOf = (body: unknown) => z.object({ id: z.string().uuid() }).parse(body).id;

async function seedSongPlayedByHugo(band: AssistantBand) {
  const instrumentId = idOf(
    (await callTool(band.assistant, 'create_instrument', { name: 'Guitar', family: 'harmonic' }))
      .body,
  );
  const otherInstrumentId = idOf(
    (await callTool(band.assistant, 'create_instrument', { name: 'Voice', family: 'vocal' })).body,
  );
  const songId = idOf(
    (
      await callTool(band.assistant, 'create_song', {
        title: 'Creep',
        status: 'idea',
        defaultLineup: { Hugo: 'Guitar' },
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

    const logged = await callTool(band.assistant, 'log_study', {
      song: 'creep',
      instrument: 'guitar',
    });
    const rows = await testDatabase()
      .select()
      .from(studyTable)
      .where(eq(studyTable.memberId, band.hugo.memberId));
    const overview = await callTool(band.assistant, 'get_studies_overview');
    const undone = await callTool(band.assistant, 'log_study', {
      song: songId,
      instrument: instrumentId,
      undo: true,
    });

    expect(logged).toEqual({ isError: false, body: { streak: 1, thisWeek: 1 } });
    expect(rows).toHaveLength(1);
    expect(overview.body).toMatchObject({
      queue: [{ song: 'Creep', songId, instrument: 'Guitar', isStudiedToday: true }],
    });
    expect(undone).toEqual({ isError: false, body: { streak: 0, thisWeek: 0 } });
    expect(await testDatabase().select().from(studyTable)).toEqual([]);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const { songId, instrumentId, otherInstrumentId } = await seedSongPlayedByHugo(band);
    const unknownId = randomUUID();

    expect(
      await callTool(band.assistant, 'log_study', { song: unknownId, instrument: instrumentId }),
    ).toEqual(refusal('song-not-found'));
    expect(
      await callTool(band.assistant, 'log_study', { song: songId, instrument: unknownId }),
    ).toEqual(refusal('instrument-not-found'));
    expect(
      await callTool(band.assistant, 'log_study', { song: songId, instrument: otherInstrumentId }),
    ).toEqual(refusal('study-not-in-lineup'));
    expect(
      await callTool(band.assistant, 'log_study', {
        song: songId,
        instrument: instrumentId,
        undo: true,
      }),
    ).toEqual(refusal('study-not-found'));
    expect(
      await callTool(band.assistant, 'log_study', { song: 'Creep', instrument: 'Kazoo' }),
    ).toEqual({
      isError: true,
      body: { error: 'instrument-not-found', reference: 'Kazoo' },
    });
  });
});
