import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jsonRequest, readJson } from '../../../test/auth-utils';
import { testDatabase } from '../../../test/database-utils';
import {
  type AssistantBand,
  callTool,
  prepareAssistantBand,
  refusal,
  seedInstrument,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';
import { studyTable } from '../studies/studies.schema';

const PHONE = '+33 6 12 34 56 78';

const signedInMemberSchema = z.object({
  memberId: z.string(),
  firstName: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});
const idOf = (body: unknown) => z.object({ id: z.string().uuid() }).parse(body).id;

function describeStudy(song: string, instrument: string, isUndoing = false) {
  return { study: { song, instrument, undo: isUndoing } };
}

async function seedSongPlayedByHugo(band: AssistantBand) {
  const instrumentId = await seedInstrument(band.hugo, { name: 'Guitar', family: 'harmonic' });
  const otherInstrumentId = await seedInstrument(band.hugo, { name: 'Voice', family: 'vocal' });
  const songId = idOf(
    (
      await callTool(band.assistant, 'save_song', {
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
describe('me tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('reads the granting member, and changes only their own contact details', async () => {
    const band = await prepareAssistantBand();

    const signedIn = signedInMemberSchema.parse((await callTool(band.assistant, 'get_me')).body);
    const updated = await callTool(band.assistant, 'update_me', { phone: PHONE });
    const lea = await readJson(
      await jsonRequest(band.lea.app, '/api/me', { cookieHeader: band.lea.cookieHeader }),
      signedInMemberSchema,
    );

    expect(signedIn).toMatchObject({ memberId: band.hugo.memberId, firstName: 'Hugo' });
    expect(updated).toEqual({
      isError: false,
      body: { id: band.hugo.memberId, updated: ['phone'] },
    });
    expect(lea.phone).toBeNull();
  });

  it('logs a study of today as the granting member, shows it in get_me, then undoes it', async () => {
    const band = await prepareAssistantBand();
    const { songId, instrumentId } = await seedSongPlayedByHugo(band);

    const logged = await callTool(band.assistant, 'update_me', {
      study: { song: 'creep', instrument: 'guitar' },
    });
    const rows = await testDatabase().select().from(studyTable);
    const profile = await callTool(band.assistant, 'get_me');
    const undone = await callTool(band.assistant, 'update_me', {
      email: 'hugo@example.com',
      study: { song: songId, instrument: instrumentId, undo: true },
    });

    expect(logged).toEqual({
      isError: false,
      body: {
        id: band.hugo.memberId,
        updated: [],
        study: { flame: { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3 } },
      },
    });
    expect(rows.map((row) => row.memberId)).toEqual([band.hugo.memberId]);
    expect(profile.body).toMatchObject({
      memberId: band.hugo.memberId,
      studies: {
        queue: [{ song: 'Creep', songId, instrument: 'Guitar', isStudiedToday: true }],
      },
      flames: {
        mine: { days: 1, isTodayCounted: true },
        band: { days: 1, isTodayCounted: true },
        members: expect.arrayContaining([{ firstName: 'Hugo', days: 1, isTodayCounted: true }]),
      },
    });
    expect(undone).toEqual({
      isError: false,
      body: {
        id: band.hugo.memberId,
        updated: ['email'],
        study: { flame: { days: 0, isTodayCounted: false, jokersLeftThisWeek: 3 } },
      },
    });
    expect(await testDatabase().select().from(studyTable)).toEqual([]);
  });

  it('answers the refusal codes the routes answer, and changes nothing when the study is refused', async () => {
    const band = await prepareAssistantBand();
    const { songId, instrumentId, otherInstrumentId } = await seedSongPlayedByHugo(band);
    const unknownId = randomUUID();

    expect(await callTool(band.assistant, 'update_me')).toEqual(refusal('empty-update'));
    expect(
      await callTool(band.assistant, 'update_me', describeStudy(unknownId, instrumentId)),
    ).toEqual(refusal('song-not-found'));
    expect(await callTool(band.assistant, 'update_me', describeStudy(songId, unknownId))).toEqual(
      refusal('instrument-not-found'),
    );
    expect(
      await callTool(band.assistant, 'update_me', {
        phone: PHONE,
        ...describeStudy(songId, otherInstrumentId),
      }),
    ).toEqual(refusal('study-not-in-lineup'));
    expect(
      await callTool(band.assistant, 'update_me', describeStudy(songId, instrumentId, true)),
    ).toEqual(refusal('study-not-found'));
    expect(await callTool(band.assistant, 'update_me', describeStudy('Creep', 'Kazoo'))).toEqual({
      isError: true,
      body: { error: 'instrument-not-found', reference: 'Kazoo' },
    });
    expect(signedInMemberSchema.parse((await callTool(band.assistant, 'get_me')).body).phone).toBe(
      undefined,
    );
  });
});
