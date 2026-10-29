import { randomBytes, randomUUID } from 'node:crypto';
import type { Lineup } from '@domain/lineup.core';
import { bootstrapAuth, resetAllRateLimits, rotatePassword } from '../auth/auth.service';
import { createCredentialForMember, readCredentialOfMember } from '../auth/credentials.service';
import { saveCalendarFeed } from '../calendar-feeds/calendar-feeds.service';
import { createInstrument } from '../instruments/instruments.service';
import { assignInstrumentsToMember, createMember } from '../members/members.service';
import type { WriteActor } from '../notifications/notifications.service';
import { createSession } from '../sessions/sessions.service';
import { appendEntry } from '../setlists/setlist-entry.service';
import { createSetlist } from '../setlists/setlists.service';
import { createSong } from '../songs/songs.service';
import { hashToken, selectTokenExpiries } from '../oauth/token.core';
import { createTask } from '../tasks/tasks.service';
import { saveTransitionComment } from '../transitions/transitions.service';
import {
  BLANK_ENTRY_DETAIL,
  SEED_INSTRUMENTS,
  SEED_MEMBERS,
  SEED_SONGS,
  SEED_TRANSITION_COMMENT,
  type SeedSong,
} from './test-seed-fixture.core';
import { countSavedFeeds, listFixtureFeedAttachments } from './calendar-feed-fixtures.core';

export { answerFixtureFeedRequest } from './calendar-feed-fixtures.core';
import { SEED_TASKS } from './test-seed-task-board.core';
import { SEED_ASSISTANT_GRANT } from './test-seed-assistant-grant.core';
import {
  buildSeedLineup,
  selectAdminCredentialsState,
  selectInstrumentIds,
} from './test-seed.core';
import { classifySchemaBoundary, type SchemaBoundary } from './schema-boundary.core';
import {
  deleteAllDomainRows,
  insertSeedAssistantGrant,
  tryReadingProductionMembers,
} from './test-seed.repository';

const CONCERT_DAYS_FROM_NOW = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const CONCERT_CAPACITY = 120;
const CONCERT_VENUE = 'Le Petit Bain';
const CONCERT_GEAR = 'Backline fournie, deux retours';
const SEED_ADMIN_PASSWORD = 'pragma-preview';
const SEED_SETLIST_NAME = 'Set principal';
const SEED_TOKEN_BYTES = 32;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

type SongCreateInput = Parameters<typeof createSong>[0];

function buildSongInput(song: SeedSong, defaultLineup: Lineup): SongCreateInput {
  return {
    title: song.title,
    artist: song.artist,
    status: song.status,
    origin: song.origin,
    links: [],
    chart: { kind: 'chordpro', text: song.chordChartText },
    tonalityStart: song.tonalityStart,
    tonalityEnd: null,
    defaultLineup,
    baseEnergy: song.baseEnergy,
    deezerTrackId: null,
    deezerAlbumId: null,
    spotifyTrackId: null,
    album: null,
    durationSeconds: null,
    isrcs: [],
    tags: [],
    structureNotes: song.structureNotes,
    gimmickNotes: song.gimmickNotes,
    notes: song.notes,
  };
}

export interface SeedSummary {
  readonly instruments: number;
  readonly members: number;
  readonly songs: number;
  readonly tasks: number;
  readonly setlistEntries: number;
  readonly adminPassword: string;
  readonly adminCredentials: 'created' | 'already-set';
  readonly calendarFeeds: number;
  readonly assistantClientId: string;
}

async function seedCalendarFeeds(
  memberIdByName: ReadonlyMap<string, string>,
  feedOrigin: string,
  now: Date,
): Promise<number> {
  const seededMembers = SEED_MEMBERS.map((seed) => ({
    memberId: memberIdByName.get(seed.firstName) ?? '',
    username: seed.username,
  }));
  const outcomes = [];
  for (const attachment of listFixtureFeedAttachments(seededMembers, feedOrigin)) {
    outcomes.push(
      await saveCalendarFeed(
        attachment.memberId,
        attachment.address,
        now,
        async () => await Promise.resolve(attachment.name),
      ),
    );
  }
  return countSavedFeeds(outcomes);
}

async function seedInstruments(): Promise<Map<string, string>> {
  const instrumentIdByName = new Map<string, string>();
  for (const seed of SEED_INSTRUMENTS) {
    const instrument = await createInstrument(seed);
    instrumentIdByName.set(seed.name, instrument.id);
  }
  return instrumentIdByName;
}

async function seedMembers(
  instrumentIdByName: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
  const memberIdByName = new Map<string, string>();
  for (const seed of SEED_MEMBERS) {
    const member = await createMember({ firstName: seed.firstName, color: seed.color });
    memberIdByName.set(seed.firstName, member.id);
    await createCredentialForMember({
      memberId: member.id,
      username: seed.username,
      password: SEED_ADMIN_PASSWORD,
      now: new Date(),
    });
    await assignInstrumentsToMember(
      member.id,
      selectInstrumentIds(seed.instrumentNames, instrumentIdByName),
    );
  }
  return memberIdByName;
}

async function seedSongs(
  memberIdByName: ReadonlyMap<string, string>,
  instrumentIdByName: ReadonlyMap<string, string>,
): Promise<string[]> {
  const songIds: string[] = [];
  for (const seed of SEED_SONGS) {
    const lineup = buildSeedLineup(seed.lineup, memberIdByName, instrumentIdByName);
    const created = await createSong(buildSongInput(seed, lineup));
    if (created.kind !== 'ok') throw new Error(`seed song ${seed.title} names a taken track`);
    songIds.push(created.song.id);
  }
  return songIds;
}

async function seedTasks(
  memberIdByName: ReadonlyMap<string, string>,
  songIdByTitle: ReadonlyMap<string, string>,
  now: Date,
): Promise<void> {
  for (const seed of SEED_TASKS) {
    await createTask({
      title: seed.title,
      notes: seed.notes,
      status: seed.status,
      assigneeId:
        seed.assigneeFirstName === null
          ? null
          : (memberIdByName.get(seed.assigneeFirstName) ?? null),
      songId: seed.songTitle === null ? null : (songIdByTitle.get(seed.songTitle) ?? null),
      sessionId: null,
      dueDate:
        seed.dueInDays === null
          ? null
          : new Date(now.getTime() + seed.dueInDays * MILLISECONDS_PER_DAY).toISOString(),
    });
  }
}

function selectSeedActor(memberIdByName: ReadonlyMap<string, string>, now: Date): WriteActor {
  const [memberId] = memberIdByName.values();
  if (memberId === undefined) throw new Error('the seed wrote no member to act as');
  return { memberId, now };
}

async function seedConcertSetlist(songIds: readonly string[], actor: WriteActor): Promise<void> {
  const now = actor.now;
  const concertDate = new Date(now.getTime() + CONCERT_DAYS_FROM_NOW * MILLISECONDS_PER_DAY);
  const concert = await createSession(
    {
      kind: 'concert',
      date: concertDate.toISOString(),
      venue: CONCERT_VENUE,
      capacity: CONCERT_CAPACITY,
      gear: CONCERT_GEAR,
      friendsCountPerMember: {},
    },
    actor,
  );
  const created = await createSetlist({ name: SEED_SETLIST_NAME, sessionId: concert.id }, actor);
  if (created.kind === 'session-not-found')
    throw new Error('seeded concert vanished before its setlist was written');
  for (const [index, songId] of songIds.entries()) {
    const detail = SEED_SONGS[index]?.entry ?? BLANK_ENTRY_DETAIL;
    await appendEntry(
      created.setlist.id,
      {
        songId,
        energy: null,
        lineupOverride: null,
        keyOverride: detail.keyOverride,
        capo: detail.capo,
        notes: detail.notes,
      },
      actor,
    );
  }
}

async function seedTransitionComment(songIds: readonly string[], actor: WriteActor): Promise<void> {
  const [, songB, songC] = songIds;
  if (songB === undefined || songC === undefined) return;
  await saveTransitionComment(songB, songC, SEED_TRANSITION_COMMENT, actor);
}

function mintSeedTokenHash(): string {
  return hashToken(randomBytes(SEED_TOKEN_BYTES).toString('base64url'));
}

async function seedAssistantGrant(
  memberIdByName: ReadonlyMap<string, string>,
  now: Date,
): Promise<string> {
  const memberId = memberIdByName.get(SEED_ASSISTANT_GRANT.memberFirstName);
  if (memberId === undefined) throw new Error('the seeded assistant grant names no seeded member');
  const credential = await readCredentialOfMember(memberId);
  if (credential === null)
    throw new Error('the seeded assistant grant names a member with no credential');
  const clientId = randomUUID();
  await insertSeedAssistantGrant({
    client: {
      id: clientId,
      name: SEED_ASSISTANT_GRANT.clientName,
      redirectUris: JSON.stringify([SEED_ASSISTANT_GRANT.redirectUri]),
      createdAt: now,
    },
    grant: {
      id: randomUUID(),
      clientId,
      memberId,
      refreshFamilyHash: mintSeedTokenHash(),
      refreshTokenHash: mintSeedTokenHash(),
      accessTokenHash: mintSeedTokenHash(),
      sessionEpoch: credential.sessionEpoch,
      createdAt: now,
      lastUsedAt: new Date(
        now.getTime() - SEED_ASSISTANT_GRANT.lastUsedMinutesAgo * MILLISECONDS_PER_MINUTE,
      ),
      ...selectTokenExpiries(now),
    },
  });
  return clientId;
}

export async function seedPreviewFixture(now: Date, feedOrigin: string): Promise<SeedSummary> {
  await deleteAllDomainRows();
  const bootstrap = await bootstrapAuth(SEED_ADMIN_PASSWORD, now);
  await rotatePassword(SEED_ADMIN_PASSWORD, now);
  const instrumentIdByName = await seedInstruments();
  const memberIdByName = await seedMembers(instrumentIdByName);
  const songIds = await seedSongs(memberIdByName, instrumentIdByName);
  const songIdByTitle = new Map(
    SEED_SONGS.map((seed, index) => [seed.title, songIds[index] ?? '']),
  );
  await seedTasks(memberIdByName, songIdByTitle, now);
  const seedActor = selectSeedActor(memberIdByName, now);
  await seedConcertSetlist(songIds, seedActor);
  await seedTransitionComment(songIds, seedActor);
  const calendarFeeds = await seedCalendarFeeds(memberIdByName, feedOrigin, now);
  const assistantClientId = await seedAssistantGrant(memberIdByName, now);

  return {
    instruments: SEED_INSTRUMENTS.length,
    members: SEED_MEMBERS.length,
    songs: SEED_SONGS.length,
    tasks: SEED_TASKS.length,
    setlistEntries: songIds.length,
    adminPassword: SEED_ADMIN_PASSWORD,
    adminCredentials: selectAdminCredentialsState(bootstrap.kind),
    calendarFeeds,
    assistantClientId,
  };
}

export async function probeProductionBoundary(): Promise<SchemaBoundary> {
  return classifySchemaBoundary(await tryReadingProductionMembers());
}

export async function resetRateLimits(): Promise<void> {
  await resetAllRateLimits();
}
