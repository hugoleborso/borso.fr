import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { CdpSession } from './cdp-session.adapter';
import { CLEAR_STORAGE, FETCH_JSON, POST_JSON, PUT_JSON } from './page-probes.setup';
import { navigateTo, TaskWalk } from './walk-recorder.setup';

const INSTANCE_SCRIPT = fileURLToPath(new URL('./pragma-instance.sh', import.meta.url));
const SEED_PASSWORD = 'pragma-preview';
const SIGN_IN_SETTLE_MS = 1500;

const setlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
  sessionIds: z.array(z.string()).optional(),
});
const songSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    chart: z.unknown().optional(),
    defaultLineup: z.unknown().optional(),
  })
  .passthrough();
const sessionSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    date: z.string().optional(),
    startsAt: z.string().optional(),
    venue: z.string().nullable().optional(),
  })
  .passthrough();
const entrySchema = z.object({
  songId: z.string(),
  position: z.number(),
  notes: z.string().nullable().optional(),
  keyOverride: z.string().nullable().optional(),
  lineupOverride: z.unknown().optional(),
});

export type BandSetlist = z.infer<typeof setlistSchema>;
export type BandSong = z.infer<typeof songSchema>;
export type BandSession = z.infer<typeof sessionSchema>;

export interface KnownRecords {
  readonly setlists: readonly BandSetlist[];
  readonly songs: readonly BandSong[];
  readonly sessions: readonly BandSession[];
  readonly main: BandSetlist;
  readonly rehearsal: BandSetlist;
  readonly concert: BandSession;
}

export interface EntrySummary {
  readonly title: string;
  readonly notes: string | null | undefined;
  readonly keyOverride: string | null | undefined;
  readonly lineupOverride: unknown;
  readonly songDefaultLineup: unknown;
}

export class BandSessionDriver {
  constructor(
    readonly session: CdpSession,
    readonly baseUrl: string,
  ) {}

  get sitePort(): string {
    return new URL(this.baseUrl).port;
  }

  async open(path: string): Promise<void> {
    await navigateTo(this.session, `${this.baseUrl}${path}`);
  }

  async fetchJson(path: string): Promise<unknown> {
    return this.session.evaluate(FETCH_JSON, path);
  }

  async putJson(path: string, body: unknown): Promise<unknown> {
    return this.session.evaluate(PUT_JSON, { path, body });
  }

  async postJson(path: string, body: unknown): Promise<unknown> {
    return this.session.evaluate(POST_JSON, { path, body });
  }

  async listFrom<Output>(
    path: string,
    key: string,
    schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
  ): Promise<Output[]> {
    const body = z.record(z.unknown()).parse(await this.fetchJson(path));
    const list = body[key];
    return Array.isArray(list) ? list.map((item) => schema.parse(item)) : [];
  }

  async signIn(user = 'hugo'): Promise<void> {
    await this.open('/login');
    const walk = new TaskWalk(this.session, 'sign-in');
    if ((await walk.readLocation()).path !== '/login') return;
    await walk.tap('name', { css: '#login-username' });
    await walk.type('name', user);
    await walk.tap('password', { css: '#login-password' });
    await walk.type('password', SEED_PASSWORD);
    await walk.tap(
      'enter',
      { css: 'button[type=submit]', scope: 'page' },
      { wait: SIGN_IN_SETTLE_MS },
    );
    if ((await walk.readLocation()).path === '/login') throw new Error('sign in failed');
  }

  async signOut(): Promise<void> {
    await this.session.send('Network.enable');
    await this.session.send('Network.clearBrowserCookies');
    await this.open('/login');
    await this.session.evaluate(CLEAR_STORAGE);
  }

  reseed(): void {
    execFileSync(INSTANCE_SCRIPT, ['reseed', this.sitePort], { stdio: 'ignore' });
  }

  async readKnownRecords(): Promise<KnownRecords> {
    const setlists = await this.listFrom('/api/setlists', 'setlists', setlistSchema);
    const songs = await this.listFrom('/api/songs', 'songs', songSchema);
    const sessions = await this.listFrom('/api/sessions', 'sessions', sessionSchema);
    const getSetlist = (pattern: RegExp): BandSetlist => {
      const found = setlists.find((setlist) => pattern.test(setlist.name));
      if (found === undefined) throw new Error(`no setlist matching ${String(pattern)}`);
      return found;
    };
    const concert = sessions.find((session) => session.kind === 'concert') ?? sessions[0];
    if (concert === undefined) throw new Error('no session in the seed');
    return {
      setlists,
      songs,
      sessions,
      main: getSetlist(/^Set principal/),
      rehearsal: getSetlist(/^Répétition du jeudi/),
      concert,
    };
  }

  async listEntries(setlistId: string): Promise<EntrySummary[]> {
    const songs = await this.listFrom('/api/songs', 'songs', songSchema);
    const songById = new Map(songs.map((song) => [song.id, song]));
    const entries = await this.listFrom(
      `/api/setlists/${setlistId}/entries`,
      'entries',
      entrySchema,
    );
    return entries
      .sort((first, second) => first.position - second.position)
      .map((entry) => {
        const song = songById.get(entry.songId);
        return {
          title: song?.title ?? entry.songId,
          notes: entry.notes,
          keyOverride: entry.keyOverride,
          lineupOverride: entry.lineupOverride,
          songDefaultLineup: song?.defaultLineup ?? song?.lineup ?? null,
        };
      });
  }

  async startFresh(
    path: string | ((known: KnownRecords) => string) = '/',
    user = 'hugo',
  ): Promise<KnownRecords> {
    this.reseed();
    await this.signOut();
    await this.signIn(user);
    const known = await this.readKnownRecords();
    await this.open(typeof path === 'function' ? path(known) : path);
    return known;
  }
}
