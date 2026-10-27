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

const idOf = (key: string, body: unknown) =>
  z.object({ [key]: z.object({ id: z.string().uuid() }) }).parse(body)[key]?.id ?? '';
const scoreRowSchema = z.object({
  memberId: z.string(),
  instrumentId: z.string(),
  score: z.number(),
});
const defaultsBodySchema = z.object({ defaults: z.array(scoreRowSchema) });
const overridesBodySchema = z.object({
  overrides: z.array(scoreRowSchema.extend({ songId: z.string() })),
});
const historyBodySchema = z.object({
  changes: z.array(scoreRowSchema.extend({ songId: z.string() })),
});

async function seedInstrumentAndSong(band: AssistantBand) {
  const instrumentId = idOf(
    'instrument',
    (await callTool(band.assistant, 'create_instrument', { name: 'Bass', family: 'harmonic' }))
      .body,
  );
  const songId = idOf(
    'song',
    (await callTool(band.assistant, 'create_song', { title: 'Creep', status: 'idea' })).body,
  );
  return { instrumentId, songId };
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('mastery tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('sets, lists and removes a default score of another member', async () => {
    const band = await prepareAssistantBand();
    const { instrumentId } = await seedInstrumentAndSong(band);
    const row = { memberId: band.lea.memberId, instrumentId, score: DEFAULT_SCORE };

    const saved = await callTool(band.assistant, 'set_mastery_default', row);
    const listed = defaultsBodySchema.parse(
      (await callTool(band.assistant, 'list_mastery_defaults')).body,
    );
    const removed = await callTool(band.assistant, 'delete_mastery_default', {
      memberId: band.lea.memberId,
      instrumentId,
    });

    expect(saved).toEqual({ isError: false, body: row });
    expect(listed.defaults).toEqual([row]);
    expect(removed).toEqual({
      isError: false,
      body: { memberId: band.lea.memberId, instrumentId, deleted: true },
    });
  });

  it('sets a score for one song, records it in the history, then removes it', async () => {
    const band = await prepareAssistantBand();
    const { instrumentId, songId } = await seedInstrumentAndSong(band);
    const key = { memberId: band.lea.memberId, instrumentId, songId };

    const saved = await callTool(band.assistant, 'set_mastery_override', {
      ...key,
      score: OVERRIDE_SCORE,
    });
    const overrides = overridesBodySchema.parse(
      (await callTool(band.assistant, 'list_mastery_overrides', { songId })).body,
    );
    const history = historyBodySchema.parse(
      (await callTool(band.assistant, 'get_mastery_history', { songId })).body,
    );
    const removed = await callTool(band.assistant, 'delete_mastery_override', key);

    expect(saved).toEqual({ isError: false, body: { ...key, score: OVERRIDE_SCORE } });
    expect(overrides.overrides).toEqual([{ ...key, score: OVERRIDE_SCORE }]);
    expect(history.changes.map((change) => change.score)).toEqual([OVERRIDE_SCORE]);
    expect(removed).toEqual({ isError: false, body: { ...key, deleted: true } });
  });

  it('answers not-found when the score to remove does not exist, as the routes do', async () => {
    const band = await prepareAssistantBand();
    const key = { memberId: band.lea.memberId, instrumentId: randomUUID() };

    expect(await callTool(band.assistant, 'delete_mastery_default', key)).toEqual(
      refusal('not-found'),
    );
    expect(
      await callTool(band.assistant, 'delete_mastery_override', { ...key, songId: randomUUID() }),
    ).toEqual(refusal('not-found'));
  });
});
