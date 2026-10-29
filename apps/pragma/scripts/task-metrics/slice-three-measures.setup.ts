import { z } from 'zod';
import { INSTRUMENT_ICONS } from '../../domain/instrument.core';
import { normalizeLineup } from '../../domain/lineup.core';
import { buildLineupGrid } from '../../site/src/components/organisms/lineup-grid.core';
import { parseHex } from '../../site/src/lib/member-color.utils';
import { pressKey } from './touch-input.adapter';
import type { BandSessionDriver } from './band-session.setup';
import {
  READ_BACK_LINK,
  READ_LINEUP_GRID,
  READ_OPEN_DIALOG_LABELS,
  READ_OPEN_SHEET,
  READ_PRIMARY_ACTIONS,
  READ_PRIMARY_STRIP_POSITION,
  READ_SETLIST_FIRST_SCREEN,
  SCROLL_TO_PAGE_END,
} from './page-probes.setup';
import { PHONE, TaskWalk, waitMilliseconds } from './walk-recorder.setup';

const ROUTE_SETTLE_MS = 900;
const SHEET_SETTLE_MS = 700;
const SCHEME_SETTLE_MS = 300;
const SMALL_PHONE = { width: 375, height: 667 } as const;
const SMALL_PHONE_INSETS = { top: 20, bottom: 0, left: 0, right: 0 } as const;
const COLOUR_SCHEMES = ['light', 'dark'] as const;
const SECOND_ENTRY_PATTERN = '^02 ';
const CLOSE_THE_VOTE = ['Close the vote'];

const storedLineupSchema = z
  .record(z.union([z.string(), z.array(z.string()), z.null()]))
  .nullable()
  .transform((stored) => (stored === null ? null : normalizeLineup(stored)));
const entrySchema = z.object({
  id: z.string(),
  songId: z.string(),
  position: z.number(),
  lineupOverride: storedLineupSchema,
});
const songSchema = z.object({
  id: z.string(),
  title: z.string(),
  defaultLineup: storedLineupSchema.default(null),
});
const memberSchema = z.object({ id: z.string(), firstName: z.string(), color: z.string() });
const instrumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.enum(INSTRUMENT_ICONS),
  position: z.number(),
});
const gridSchema = z.object({
  rowCount: z.number(),
  rowsFullyVisible: z.number(),
  cells: z.array(
    z.object({
      entryId: z.string(),
      memberId: z.string(),
      isPlaying: z.boolean(),
      isChanged: z.boolean(),
      fill: z.string(),
      height: z.number(),
    }),
  ),
  lanes: z.array(z.object({ memberId: z.string(), style: z.string() })),
  pageWidth: z.number(),
  viewportWidth: z.number(),
});
const firstScreenSchema = z
  .object({ firstRowTop: z.number().nullable(), stickyElements: z.number() })
  .passthrough();
const primaryActionSchema = z.array(z.object({ name: z.string(), centreFraction: z.number() }));
const stripPositionSchema = z.object({ top: z.number(), isOnScreen: z.boolean() }).nullable();

function toRgb(hex: string): string | null {
  const channels = parseHex(hex);
  if (channels === null) return null;
  return `rgb(${String(channels.r)}, ${String(channels.g)}, ${String(channels.b)})`;
}

async function listOf<Row>(
  driver: BandSessionDriver,
  path: string,
  key: string,
  schema: z.ZodType<Row, z.ZodTypeDef, unknown>,
): Promise<Row[]> {
  const body = z.record(z.unknown()).parse(await driver.fetchJson(path));
  return z.array(schema).parse(body[key]);
}

async function resizeTo(
  driver: BandSessionDriver,
  size: { readonly width: number; readonly height: number },
  insets: Readonly<Record<'top' | 'bottom' | 'left' | 'right', number>>,
): Promise<void> {
  await driver.session.send('Emulation.setDeviceMetricsOverride', {
    width: size.width,
    height: size.height,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    mobile: true,
  });
  await driver.session.send('Emulation.setSafeAreaInsetsOverride', { insets });
  await waitMilliseconds(ROUTE_SETTLE_MS);
}

async function measureSetlistFirstScreen(
  driver: BandSessionDriver,
): Promise<Record<string, unknown>> {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const atPhone = firstScreenSchema.parse(await driver.session.evaluate(READ_SETLIST_FIRST_SCREEN));
  let atSmallPhone: z.infer<typeof firstScreenSchema>;
  try {
    await resizeTo(driver, SMALL_PHONE, SMALL_PHONE_INSETS);
    atSmallPhone = firstScreenSchema.parse(
      await driver.session.evaluate(READ_SETLIST_FIRST_SCREEN),
    );
  } finally {
    await resizeTo(driver, PHONE, PHONE.insets);
  }
  return {
    [`${String(PHONE.width)}x${String(PHONE.height)}`]: atPhone,
    [`${String(SMALL_PHONE.width)}x${String(SMALL_PHONE.height)}`]: atSmallPhone,
  };
}

async function readExpectedChanges(
  driver: BandSessionDriver,
  setlistId: string,
): Promise<{ readonly changed: ReadonlySet<string>; readonly colours: Map<string, string> }> {
  const entries = await listOf(
    driver,
    `/api/setlists/${setlistId}/entries`,
    'entries',
    entrySchema,
  );
  const songs = await listOf(driver, '/api/songs', 'songs', songSchema);
  const members = await listOf(driver, '/api/members', 'members', memberSchema);
  const instruments = await listOf(driver, '/api/instruments', 'instruments', instrumentSchema);
  const grid = buildLineupGrid({
    entries: entries.toSorted((first, second) => first.position - second.position),
    songsById: Object.fromEntries(
      songs.map((song) => [
        song.id,
        { title: song.title, defaultLineup: song.defaultLineup ?? {} },
      ]),
    ),
    members,
    instruments,
  });
  const changed = new Set(
    grid.rows.flatMap((row) =>
      row.cells.filter((cell) => cell.isChanged).map((cell) => `${row.entryId}:${cell.memberId}`),
    ),
  );
  return { changed, colours: new Map(members.map((member) => [member.id, member.color])) };
}

async function measureLineupGrid(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const known = await driver.startFresh((records) => `/setlists/${records.main.id}?view=lineup`);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const expected = await readExpectedChanges(driver, known.main.id);
  const bySchemes: Record<string, unknown> = {};
  let firstScreen: z.infer<typeof gridSchema> | null = null;
  try {
    for (const scheme of COLOUR_SCHEMES) {
      await driver.session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: scheme }],
      });
      await waitMilliseconds(SCHEME_SETTLE_MS);
      const grid = gridSchema.parse(await driver.session.evaluate(READ_LINEUP_GRID));
      firstScreen ??= grid;
      const played = grid.cells.filter((cell) => cell.isPlaying);
      bySchemes[scheme] = {
        playedCells: played.length,
        playedCellsInMemberColour: played.filter(
          (cell) => cell.fill === toRgb(expected.colours.get(cell.memberId) ?? ''),
        ).length,
        columns: grid.lanes.length,
        columnsTintedWithMemberColour: grid.lanes.filter((lane) =>
          lane.style.includes((expected.colours.get(lane.memberId) ?? '#none').toLowerCase()),
        ).length,
      };
    }
  } finally {
    await driver.session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    });
  }
  const marked = new Set(
    (firstScreen?.cells ?? [])
      .filter((cell) => cell.isChanged)
      .map((cell) => `${cell.entryId}:${cell.memberId}`),
  );
  return {
    rowCount: firstScreen?.rowCount ?? 0,
    rowsWithFullLineupOnFirstScreen: firstScreen?.rowsFullyVisible ?? 0,
    sidewaysScroll: (firstScreen?.pageWidth ?? 0) > (firstScreen?.viewportWidth ?? 0),
    smallestCellHeight: Math.min(...(firstScreen?.cells ?? []).map((cell) => cell.height)),
    changesExpected: expected.changed.size,
    changesMarked: [...expected.changed].filter((key) => marked.has(key)).length,
    marksWithoutChange: [...marked].filter((key) => !expected.changed.has(key)).length,
    colours: bySchemes,
  };
}

async function measureEntrySheet(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const walk = new TaskWalk(driver.session, 'entry sheet');
  await walk.tap('Open entry 02', { text: SECOND_ENTRY_PATTERN, css: 'main button' });
  await waitMilliseconds(SHEET_SETTLE_MS);
  const sheet = await driver.session.evaluate(READ_OPEN_SHEET);
  await walk.tap('Record a take', { exact: 'Record a take', css: 'button', scope: 'dialog' });
  await waitMilliseconds(SHEET_SETTLE_MS);
  const dialogsAfterRecord = z
    .array(z.string())
    .parse(await driver.session.evaluate(READ_OPEN_DIALOG_LABELS));
  await pressKey(driver.session, 'Escape');
  return { sheet, dialogsAfterRecord, mostSheetsOpenAtOnce: dialogsAfterRecord.length };
}

async function measureVotePage(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await driver.startFresh((records) => `/setlists/${records.rehearsal.id}/vote`);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const backLink = await driver.session.evaluate(READ_BACK_LINK);
  const beforeOpening = primaryActionSchema.parse(
    await driver.session.evaluate(READ_PRIMARY_ACTIONS),
  );
  const walk = new TaskWalk(driver.session, 'vote page');
  await walk.tap('Open a vote', { exact: 'Open a vote', css: 'button', scope: 'page' });
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const onArrival = primaryActionSchema.parse(await driver.session.evaluate(READ_PRIMARY_ACTIONS));
  await driver.session.evaluate(SCROLL_TO_PAGE_END);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const atPageEnd = stripPositionSchema.parse(
    await driver.session.evaluate(READ_PRIMARY_STRIP_POSITION, CLOSE_THE_VOTE),
  );
  return { backLink, beforeOpening, onArrival, closeTheVoteAtPageEnd: atPageEnd };
}

export async function measureSliceThree(
  driver: BandSessionDriver,
): Promise<Record<string, unknown>> {
  return {
    setlistFirstScreen: await measureSetlistFirstScreen(driver),
    lineupGrid: await measureLineupGrid(driver),
    entrySheet: await measureEntrySheet(driver),
    votePage: await measureVotePage(driver),
  };
}
