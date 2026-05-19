/**
 * Drizzle schema for pragma. One Postgres schema (`pragma`), tables per
 * domain entity. JSONB blobs (`links`, `chart`, `default_lineup`,
 * `lineup_override`, `friends_count_per_member`) are validated via Zod
 * at the API boundary — see the `*.schema.ts` files alongside each
 * route.
 *
 * Foreign keys are declared in TypeScript for documentation but Aurora
 * DSQL does not enforce them at write time (see last-loop-lepin's
 * runner.schema.ts header). App-level invariants live in the service
 * layer.
 */

import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Drizzle ships no first-class `bytea` type; declare one. Stored as
// raw bytes; read/written as `Buffer` (Node) or `Uint8Array` after
// `Buffer.from` in tests.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return 'bytea';
  },
});

/**
 * Singleton row carrying the shared-password argon2id hash + the HMAC
 * signing key for session cookies. See ADR-0004. The CHECK constraint
 * `id = 1` is the singleton guard.
 */
export const appConfigTable = pgTable('app_config', {
  id: integer('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  hmacKey: bytea('hmac_key').notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const memberTable = pgTable('member', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  color: text('color').notNull(),
  avatarS3Key: text('avatar_s3_key'),
});

export const instrumentTable = pgTable('instrument', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isHarmonic: boolean('is_harmonic').notNull().default(false),
});

export const songTable = pgTable('song', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status').notNull(),
  links: jsonb('links').notNull().default([]),
  chart: jsonb('chart'),
  tonalityStart: text('tonality_start'),
  tonalityEnd: text('tonality_end'),
  defaultLineup: jsonb('default_lineup').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const masteryDefaultTable = pgTable(
  'mastery_default',
  {
    memberId: uuid('member_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    score: integer('score').notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.memberId, table.instrumentId] }),
  }),
);

export const masteryOverrideTable = pgTable(
  'mastery_override',
  {
    memberId: uuid('member_id').notNull(),
    instrumentId: uuid('instrument_id').notNull(),
    songId: uuid('song_id').notNull(),
    score: integer('score').notNull(),
  },
  (table) => ({
    primary: primaryKey({ columns: [table.memberId, table.instrumentId, table.songId] }),
  }),
);

export const sessionTable = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  date: timestamp('date', { withTimezone: true, mode: 'date' }).notNull(),
  preparedConcertId: uuid('prepared_concert_id'),
  venue: text('venue'),
  capacity: integer('capacity'),
  gear: text('gear'),
  friendsCountPerMember: jsonb('friends_count_per_member'),
});

export const setlistTable = pgTable('setlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().unique(),
});

export const setlistEntryTable = pgTable('setlist_entry', {
  id: uuid('id').primaryKey().defaultRandom(),
  setlistId: uuid('setlist_id').notNull(),
  songId: uuid('song_id').notNull(),
  position: integer('position').notNull(),
  lineupOverride: jsonb('lineup_override'),
  energy: integer('energy'),
});

export const transitionCommentTable = pgTable(
  'transition_comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    songAId: uuid('song_a_id').notNull(),
    songBId: uuid('song_b_id').notNull(),
    comment: text('comment').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    orderedPair: uniqueIndex('transition_comment_ordered_pair').on(table.songAId, table.songBId),
  }),
);

export const barTable = pgTable('bar', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  notes: text('notes').notNull().default(''),
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true, mode: 'date' }),
});

export const authAttemptTable = pgTable('auth_attempt', {
  ipHash: text('ip_hash').primaryKey(),
  count: integer('count').notNull().default(0),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true, mode: 'date' }).notNull(),
});
