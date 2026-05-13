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

export async function findEditionBySlug(database: Database, slug: string): Promise<RaceEdition | null> {
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
  await database
    .update(editionsTable)
    .set({ status })
    .where(eq(editionsTable.slug, slug));
}
