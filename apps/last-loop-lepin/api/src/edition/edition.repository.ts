import { eq } from 'drizzle-orm';
import type { Database } from '../database/client';
import { editionsTable, gpxMetadataSchema, isEditionStatus } from './edition.schema';
import type { EditionStatus, RaceEdition } from './edition.types';

interface EditionRow {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly sunriseAt: Date;
  readonly sunsetAt: Date;
  readonly intervalMinutes: number;
  readonly gpx: string;
  readonly status: string;
}

// @FollowsBlueprint repository-row-mapper
function rowToEdition(row: EditionRow): RaceEdition {
  // gpx is stored as JSON-encoded text (Aurora DSQL doesn't support jsonb).
  // The `as unknown` step is the JSON-parse escape hatch the repo allows;
  // gpxMetadataSchema does the runtime validation.
  const gpxRaw: unknown = JSON.parse(row.gpx);
  const gpx = gpxMetadataSchema.parse(gpxRaw);
  if (!isEditionStatus(row.status)) {
    throw new Error(`unknown edition status in database: ${row.status}`);
  }
  return {
    slug: row.slug,
    displayName: row.displayName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    sunriseAt: row.sunriseAt,
    sunsetAt: row.sunsetAt,
    intervalMinutes: row.intervalMinutes,
    gpx,
    status: row.status,
  };
}

export async function insertEdition(database: Database, edition: RaceEdition): Promise<void> {
  await database.insert(editionsTable).values({
    slug: edition.slug,
    displayName: edition.displayName,
    startsAt: edition.startsAt,
    endsAt: edition.endsAt,
    sunriseAt: edition.sunriseAt,
    sunsetAt: edition.sunsetAt,
    intervalMinutes: edition.intervalMinutes,
    gpx: JSON.stringify(edition.gpx),
    status: edition.status,
  });
}

/**
 * Write an edition, replacing every field when the slug already exists.
 * The test seeding endpoint rebuilds one fixture edition over and over, and
 * an upsert lets it do that without first asking whether the row is there.
 */
/**
 * @Blueprint repository-idempotent-upsert
 * @BlueprintName Repository Idempotent Upsert
 * @BlueprintUsage Use for a write a caller may replay, so a fixture or a retry does not need a delete first.
 * @BlueprintDescription Builds the column values once and passes the same object to `values` and to `onConflictDoUpdate`, keyed on the slug, so inserting and replacing stay in step and a second call with different content overwrites rather than failing on the primary key.
 */
export async function upsertEdition(database: Database, edition: RaceEdition): Promise<void> {
  const values = {
    slug: edition.slug,
    displayName: edition.displayName,
    startsAt: edition.startsAt,
    endsAt: edition.endsAt,
    sunriseAt: edition.sunriseAt,
    sunsetAt: edition.sunsetAt,
    intervalMinutes: edition.intervalMinutes,
    gpx: JSON.stringify(edition.gpx),
    status: edition.status,
  };
  await database
    .insert(editionsTable)
    .values(values)
    .onConflictDoUpdate({ target: editionsTable.slug, set: values });
}

// @FollowsBlueprint repository-query
export async function findEditionBySlug(
  database: Database,
  slug: string,
): Promise<RaceEdition | null> {
  const rows = await database
    .select({
      slug: editionsTable.slug,
      displayName: editionsTable.displayName,
      startsAt: editionsTable.startsAt,
      endsAt: editionsTable.endsAt,
      sunriseAt: editionsTable.sunriseAt,
      sunsetAt: editionsTable.sunsetAt,
      intervalMinutes: editionsTable.intervalMinutes,
      gpx: editionsTable.gpx,
      status: editionsTable.status,
    })
    .from(editionsTable)
    .where(eq(editionsTable.slug, slug))
    .limit(1);

  const row = rows[0];
  return row === undefined ? null : rowToEdition(row);
}

export async function listEditions(database: Database): Promise<readonly RaceEdition[]> {
  const rows = await database.select().from(editionsTable);
  return rows.map((row) => rowToEdition(row));
}

export async function updateEditionStatus(
  database: Database,
  slug: string,
  status: EditionStatus,
): Promise<void> {
  await database.update(editionsTable).set({ status }).where(eq(editionsTable.slug, slug));
}

/**
 * Replace every mutable field of an existing edition. The caller is
 * responsible for gating this on `status === 'setup'` — once the race
 * is live, the schedule + GPX become history and shouldn't shift.
 */
export async function updateEditionSetup(
  database: Database,
  slug: string,
  edition: RaceEdition,
): Promise<void> {
  await database
    .update(editionsTable)
    .set({
      displayName: edition.displayName,
      startsAt: edition.startsAt,
      endsAt: edition.endsAt,
      sunriseAt: edition.sunriseAt,
      sunsetAt: edition.sunsetAt,
      intervalMinutes: edition.intervalMinutes,
      gpx: JSON.stringify(edition.gpx),
    })
    .where(eq(editionsTable.slug, slug));
}

export async function deleteEdition(database: Database, slug: string): Promise<void> {
  await database.delete(editionsTable).where(eq(editionsTable.slug, slug));
}
