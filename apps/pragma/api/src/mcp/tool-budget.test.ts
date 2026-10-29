import { randomUUID } from 'node:crypto';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { extractSessionCookie, loginAsMember, SESSION_COOKIE_NAME } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  buildAssistantHarness,
  connectAssistant,
  openMcpClient,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import { stubPushService } from '../../../test/push-utils';
import { SEED_MEMBERS, SEED_SONGS } from '../__test/test-seed-fixture.core';
import { seedPreviewFixture } from '../__test/test-seed.service';
import { createSession } from '../sessions/sessions.service';
import { appendEntry, createSetlist } from '../setlists/setlists.service';
import { getSongs } from '../songs/songs.service';
import { createTake, createTakeComment, mintTakeUpload } from '../takes/takes.service';

const PRESIGNER_ENV = {
  AWS_ACCESS_KEY_ID: 'AKIA-PRAGMA-TEST',
  AWS_SECRET_ACCESS_KEY: 'pragma-secret-long-enough-for-sigv4-signing',
  AWS_REGION: 'eu-west-3',
  UPLOADS_BUCKET: 'pragma-test-uploads',
} as const;
const FEED_ORIGIN = 'http://localhost';
const MILLISECONDS_PER_DAY = 86_400_000;
const PRACTICE_IN_DAYS = 3;
const NEW_PRACTICE_IN_DAYS = 6;
const PAST_PRACTICE_DAYS_AGO = 4;
const TAKES_PER_SONG = 3;
const TAKE_BYTES = 4_000_000;
const TAKE_SECONDS = 240;
const COMMENT_MOMENT_SECONDS = 60;
const PRACTICE_SONG_COUNT = 4;
const PLANNED_SONG_COUNT = 5;
const ISO_DAY_LENGTH = 10;
const SEEDED_MEMBER = SEED_MEMBERS[0];

const TOOL_COUNT = 35;
const TOOL_LIST_CHARACTERS_MAX = 19_000;
const WRITE_CONFIRMATION_CHARACTERS_MAX = 200;

interface TaskBudget {
  readonly calls: number;
  readonly characters: number;
}

const TASK_BUDGETS: Readonly<Record<string, TaskBudget>> = {
  'add a song to the next practice': { calls: 2, characters: 1_500 },
  'what to practise for the next concert': { calls: 1, characters: 2_200 },
  'who plays bass on a song': { calls: 1, characters: 500 },
  'hear what the band said about the latest take of a song': { calls: 1, characters: 350 },
  'plan a practice with five songs': { calls: 2, characters: 250 },
  'swap two songs of the concert setlist': { calls: 2, characters: 2_400 },
  'read the transition notes of a setlist': { calls: 1, characters: 1_400 },
  'list my tasks': { calls: 1, characters: 550 },
  "set a member's mastery on a song": { calls: 1, characters: 150 },
  'brief me on the next concert': { calls: 1, characters: 2_300 },
};

const READ_BUDGETS: Readonly<Record<string, number>> = {
  find_songs: 1_000,
  get_song: 500,
  get_session: 2_300,
  get_setlist: 1_200,
  find_sessions: 400,
  list_tasks: 1_300,
  list_takes: 600,
  get_take: 400,
  list_members: 600,
  list_instruments: 800,
  get_me: 2_200,
};

const textContentSchema = z.array(z.object({ type: z.literal('text'), text: z.string() }));
const sessionPlanSchema = z.object({
  setlists: z.array(z.object({ id: z.string().uuid() })).min(1),
});

interface ToolCall {
  readonly tool: string;
  readonly characters: number;
  readonly isError: boolean;
  readonly text: string;
}

class CallLog {
  readonly calls: ToolCall[] = [];

  constructor(private readonly client: Client) {}

  async call(tool: string, toolArguments: Record<string, unknown> = {}): Promise<unknown> {
    const reply = await this.client.callTool({ name: tool, arguments: toolArguments });
    const [content] = textContentSchema.parse(reply.content);
    const text = content?.text ?? '';
    this.calls.push({ tool, characters: text.length, isError: reply.isError === true, text });
    const body: unknown = JSON.parse(text);
    return body;
  }

  spent(): TaskBudget & { readonly refusals: readonly string[] } {
    return {
      calls: this.calls.length,
      characters: this.calls.reduce((total, call) => total + call.characters, 0),
      refusals: this.calls.filter((call) => call.isError).map((call) => call.text),
    };
  }
}

function daysFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * MILLISECONDS_PER_DAY);
}

async function seedTakesOf(songId: string, actor: { memberId: string; now: Date }) {
  for (let index = 0; index < TAKES_PER_SONG; index += 1) {
    const takeId = randomUUID();
    const upload = await mintTakeUpload(
      { takeId, songId, contentType: 'audio/mpeg', contentLength: TAKE_BYTES },
      actor.now,
    );
    if (upload.kind !== 'ok') throw new Error('the seeded song refused a take upload');
    await createTake(
      {
        id: takeId,
        objectKey: upload.objectKey,
        songId,
        sessionId: null,
        recordedAt: daysFrom(actor.now, -(index + 1)).toISOString(),
        durationSeconds: TAKE_SECONDS,
        contentType: 'audio/mpeg',
        source: 'upload',
        queued: false,
      },
      actor,
    );
    await createTakeComment(
      takeId,
      { body: 'Le pont est trop rapide, on ralentit.', atSeconds: COMMENT_MOMENT_SECONDS },
      actor,
    );
  }
}

async function seedBand(now: Date) {
  const summary = await seedPreviewFixture(now, FEED_ORIGIN);
  const harness = buildAssistantHarness();
  const login = await loginAsMember(harness.app, SEEDED_MEMBER?.username, summary.adminPassword);
  const cookie = extractSessionCookie(login);
  if (cookie === null) throw new Error('the seeded member could not sign in');
  const memberResponse = await harness.app.request('http://localhost/api/me', {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${cookie}` },
  });
  const { memberId } = z.object({ memberId: z.string() }).parse(await memberResponse.json());
  const actor = { memberId, now };
  const practice = await createSession(
    {
      kind: 'practice',
      date: daysFrom(now, PRACTICE_IN_DAYS).toISOString(),
      preparedConcertId: null,
      origin: null,
    },
    actor,
  );
  await createSession(
    {
      kind: 'practice',
      date: daysFrom(now, -PAST_PRACTICE_DAYS_AGO).toISOString(),
      preparedConcertId: null,
      origin: null,
    },
    actor,
  );
  const songs = await getSongs();
  const practiceSetlist = await createSetlist({ name: 'Répète', sessionId: practice.id }, actor);
  if (practiceSetlist.kind !== 'ok') throw new Error('the seeded practice vanished');
  for (const song of songs.slice(0, PRACTICE_SONG_COUNT)) {
    await appendEntry(
      practiceSetlist.setlist.id,
      {
        songId: song.id,
        energy: null,
        lineupOverride: null,
        keyOverride: null,
        capo: null,
        notes: '',
      },
      actor,
    );
  }
  const [songWithTakes] = songs;
  if (songWithTakes === undefined) throw new Error('the seed wrote no song');
  await seedTakesOf(songWithTakes.id, actor);
  const tokens = await connectAssistant(harness.app, {
    app: harness.app,
    cookieHeader: `${SESSION_COOKIE_NAME}=${cookie}`,
    memberId,
  });
  return { client: await openMcpClient(harness.app, tokens.accessToken), songWithTakes };
}

function titleOf(index: number): string {
  return SEED_SONGS[index]?.title ?? '';
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('assistant tool budget (back-e2e)', () => {
  useOAuthOrigins();

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    stubPushService();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const [name, value] of Object.entries(PRESIGNER_ENV)) vi.stubEnv(name, value);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('keeps the tool list an assistant reads before any call within its budget', async () => {
    const { client } = await seedBand(new Date());

    const { tools } = await client.listTools();

    expect(tools.length).toBe(TOOL_COUNT);
    expect(JSON.stringify(tools).length).toBeLessThanOrEqual(TOOL_LIST_CHARACTERS_MAX);
  });

  it('answers each typical band task within its budget of calls and characters', async () => {
    const now = new Date();
    const { client, songWithTakes } = await seedBand(now);
    const spent: Record<string, ReturnType<CallLog['spent']>> = {};
    const runTask = async (name: string, steps: (log: CallLog) => Promise<void>) => {
      const log = new CallLog(client);
      await steps(log);
      spent[name] = log.spent();
    };

    await runTask('add a song to the next practice', async (log) => {
      const plan = sessionPlanSchema.parse(
        await log.call('get_session', { session: 'next-practice' }),
      );
      await log.call('add_setlist_entries', {
        setlist: plan.setlists[0]?.id,
        songs: [titleOf(SEED_SONGS.length - 1)],
      });
    });
    await runTask('what to practise for the next concert', async (log) => {
      await log.call('get_me');
    });
    await runTask('who plays bass on a song', async (log) => {
      await log.call('get_song', { song: titleOf(2) });
    });
    await runTask('hear what the band said about the latest take of a song', async (log) => {
      await log.call('get_take', { song: songWithTakes.title });
    });
    await runTask('plan a practice with five songs', async (log) => {
      const day = daysFrom(now, NEW_PRACTICE_IN_DAYS).toISOString();
      await log.call('save_session', { kind: 'practice', date: day });
      await log.call('save_setlist', {
        name: 'Mardi',
        session: day.slice(0, ISO_DAY_LENGTH),
        songs: SEED_SONGS.slice(1, 1 + PLANNED_SONG_COUNT).map((song) => song.title),
      });
    });
    await runTask('swap two songs of the concert setlist', async (log) => {
      const plan = sessionPlanSchema.parse(
        await log.call('get_session', { session: 'next-concert' }),
      );
      await log.call('reorder_setlist', {
        setlist: plan.setlists[0]?.id,
        swap: [titleOf(0), titleOf(1)],
      });
    });
    await runTask('read the transition notes of a setlist', async (log) => {
      await log.call('get_setlist', { setlist: 'Répète' });
    });
    await runTask('list my tasks', async (log) => {
      await log.call('list_tasks', { assignee: 'me' });
    });
    await runTask("set a member's mastery on a song", async (log) => {
      await log.call('set_song_mastery', {
        song: titleOf(2),
        member: SEED_MEMBERS[2]?.firstName,
        instrument: 'Basse',
        score: 7,
      });
    });
    await runTask('brief me on the next concert', async (log) => {
      await log.call('get_session', { session: 'next-concert' });
    });

    const budgetEntries = Object.entries(TASK_BUDGETS);
    expect(Object.fromEntries(budgetEntries.map(([name]) => [name, spent[name]?.calls]))).toEqual(
      Object.fromEntries(budgetEntries.map(([name, budget]) => [name, budget.calls])),
    );
    expect(budgetEntries.flatMap(([name]) => spent[name]?.refusals ?? [name])).toEqual([]);
    expect(
      budgetEntries
        .filter(([name, budget]) => (spent[name]?.characters ?? Infinity) > budget.characters)
        .map(([name, budget]) => ({ name, spent: spent[name]?.characters, budget })),
    ).toEqual([]);
  });

  it('keeps each representative read within its budget, and every write confirmation short', async () => {
    const { client, songWithTakes } = await seedBand(new Date());
    const log = new CallLog(client);

    await log.call('find_songs');
    await log.call('get_song', { song: songWithTakes.title });
    await log.call('get_session', { session: 'next-concert' });
    await log.call('get_setlist', { setlist: 'Répète' });
    await log.call('find_sessions');
    await log.call('list_tasks');
    await log.call('list_takes', { song: songWithTakes.id });
    await log.call('get_take', { song: songWithTakes.id });
    await log.call('list_members');
    await log.call('list_instruments');
    await log.call('get_me');
    const writes = new CallLog(client);
    await writes.call('save_song', { title: 'Creep', status: 'idea' });
    await writes.call('save_song', { song: 'Creep', status: 'wip' });
    await writes.call('add_setlist_entries', { setlist: 'Répète', songs: ['Creep'] });
    await writes.call('save_task', { title: 'Book the van', assignee: 'me' });
    await writes.call('delete', { kind: 'task', id: 'Book the van' });

    expect(log.calls.map((call) => ({ tool: call.tool, isError: call.isError }))).toEqual(
      Object.keys(READ_BUDGETS).map((tool) => ({ tool, isError: false })),
    );
    expect(
      log.calls
        .filter((call) => call.characters > (READ_BUDGETS[call.tool] ?? 0))
        .map((call) => ({ tool: call.tool, characters: call.characters })),
    ).toEqual([]);
    expect(
      writes.calls
        .filter((call) => call.isError || call.characters > WRITE_CONFIRMATION_CHARACTERS_MAX)
        .map((call) => ({ tool: call.tool, text: call.text })),
    ).toEqual([]);
  });
});
