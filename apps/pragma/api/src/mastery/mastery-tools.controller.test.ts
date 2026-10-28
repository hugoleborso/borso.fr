import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  type AssistantBand,
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const DEFAULT_SCORE = 6;
const OVERRIDE_SCORE = 9;

const idOf = (body: unknown) => z.object({ id: z.string().uuid() }).parse(body).id;

async function seedInstrumentAndSong(band: AssistantBand) {
  const instrumentId = idOf(
    (await callTool(band.assistant, 'create_instrument', { name: 'Bass', family: 'harmonic' }))
      .body,
  );
  const songId = idOf(
    (await callTool(band.assistant, 'create_song', { title: 'Creep', status: 'idea' })).body,
  );
  return { instrumentId, songId };
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('mastery tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('sets, lists and removes a default score of another member, by name', async () => {
    const band = await prepareAssistantBand();
    const { instrumentId } = await seedInstrumentAndSong(band);

    const saved = await callTool(band.assistant, 'set_mastery_default', {
      member: 'Léa',
      instrument: 'bass',
      score: DEFAULT_SCORE,
    });
    const listed = await callTool(band.assistant, 'list_mastery_defaults', { member: 'lea' });
    const others = await callTool(band.assistant, 'list_mastery_defaults', { member: 'Hugo' });
    const removed = await callTool(band.assistant, 'set_mastery_default', {
      member: band.lea.memberId,
      instrument: instrumentId,
      score: null,
    });

    expect(saved).toEqual({
      isError: false,
      body: { member: 'Léa', instrument: 'bass', score: DEFAULT_SCORE },
    });
    expect(listed.body).toEqual({
      defaults: [{ member: 'Léa', instrument: 'Bass', score: DEFAULT_SCORE }],
    });
    expect(others.body).toEqual({ defaults: [] });
    expect(removed).toEqual({
      isError: false,
      body: { member: band.lea.memberId, instrument: instrumentId },
    });
  });

  it('sets a score for one song, records it in the history, then removes it', async () => {
    const band = await prepareAssistantBand();
    const { songId } = await seedInstrumentAndSong(band);
    const key = { song: 'Creep', member: 'Léa', instrument: 'Bass' };

    const saved = await callTool(band.assistant, 'set_song_mastery', {
      ...key,
      score: OVERRIDE_SCORE,
    });
    const read = await callTool(band.assistant, 'get_song_mastery', { song: 'creep' });
    const withHistory = await callTool(band.assistant, 'get_song_mastery', {
      song: songId,
      history: true,
    });
    const removed = await callTool(band.assistant, 'set_song_mastery', { ...key, score: null });

    expect(saved).toEqual({
      isError: false,
      body: { songId, member: 'Léa', instrument: 'Bass', score: OVERRIDE_SCORE },
    });
    expect(read.body).toEqual({
      overrides: [{ member: 'Léa', instrument: 'Bass', score: OVERRIDE_SCORE }],
    });
    expect(withHistory.body).toMatchObject({
      history: [{ member: 'Léa', instrument: 'Bass', score: OVERRIDE_SCORE }],
    });
    expect(removed).toEqual({
      isError: false,
      body: { songId, member: 'Léa', instrument: 'Bass' },
    });
  });

  it('answers not-found when the score to remove does not exist, as the routes do', async () => {
    const band = await prepareAssistantBand();
    await seedInstrumentAndSong(band);
    const key = { member: band.lea.memberId, instrument: randomUUID() };

    expect(await callTool(band.assistant, 'set_mastery_default', { ...key, score: null })).toEqual(
      refusal('not-found'),
    );
    expect(
      await callTool(band.assistant, 'set_song_mastery', { ...key, song: 'Creep', score: null }),
    ).toEqual(refusal('not-found'));
    expect(
      await callTool(band.assistant, 'set_mastery_default', {
        member: 'Marc',
        instrument: 'Bass',
        score: 3,
      }),
    ).toEqual({ isError: true, body: { error: 'member-not-found', reference: 'Marc' } });
  });
});
