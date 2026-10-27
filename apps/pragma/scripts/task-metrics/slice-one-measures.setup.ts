import { z } from 'zod';
import { pressKey, tapAt } from './argent-input.adapter';
import type { BandSessionDriver } from './band-session.setup';
import {
  COUNT_SMALL_TAP_TARGETS,
  FIND_BACKDROP_POINT,
  READ_FONT_SIZES,
  READ_LOW_CONTRAST_TEXT,
  READ_MEMBER_COLOURED_TEXT,
  READ_OPEN_SHEET,
  READ_OPEN_TEXTAREA_VALUE,
  READ_PRIMARY_STRIP_POSITION,
  READ_SETLIST_FIRST_SCREEN,
  SCROLL_TO_PAGE_END,
} from './page-probes.setup';
import { buildSignedInRoutePlan, type RouteTarget } from './route-measures.setup';
import {
  buildDelaySequence,
  countFullTextRuns,
  listDistinctFontSizes,
  sumCounts,
  type RouteFontSizes,
} from './task-metrics.core';
import { TaskWalk, waitMilliseconds } from './walk-recorder.setup';

const MINIMUM_TAP_TARGET_PX = 44;
const MINIMUM_TEXT_CONTRAST = 4.5;
const ROUTE_SETTLE_MS = 600;
const SHEET_SETTLE_MS = 700;
const NOTE_RACE_RUNS = 8;
const NOTE_RACE_TEXT = 'Finir sur le refrain ok';
const NOTE_RACE_MAXIMUM_DELAY_MS = 700;
const NOTE_RACE_SETTLE_MS = 6000;
const TRANSITION_DRAFT_TEXT = 'Brouillon de transition';
const TRANSITION_INDEX = 3;
const SECOND_ENTRY_PATTERN = '^\\S+ 02 ';
const ENTRY_SAVE_URL_PATTERN = '*/api/setlists/*/entries/*';
const ADD_SONG_NAMES = ['Add song', 'Add songs'];
const PAGE_END_SETTLE_MS = 800;
const FIRST_SEED = 1;

const memberListSchema = z.object({ members: z.array(z.object({ color: z.string() })) });
const countWithSamplesSchema = z.object({ count: z.number(), samples: z.array(z.unknown()) });
const openSheetSchema = z
  .object({
    title: z.string(),
    holdsField: z.boolean(),
    isFocusOnCancelOrClose: z.boolean(),
    innerVerticalScrollAreas: z.number(),
  })
  .passthrough();
const pausedRequestSchema = z.object({
  requestId: z.string(),
  request: z.object({ method: z.string() }),
});
const pointSchema = z.object({ x: z.number(), y: z.number() });
const stripPositionSchema = z.object({ top: z.number(), isOnScreen: z.boolean() }).nullable();
const entryNotesSchema = z.object({ notes: z.string().nullable().optional() });

async function readMemberColours(driver: BandSessionDriver): Promise<string[]> {
  const parsed = memberListSchema.safeParse(await driver.fetchJson('/api/members'));
  return parsed.success ? parsed.data.members.map((member) => member.color) : [];
}

interface RouteLook extends RouteFontSizes {
  readonly memberColouredText: z.infer<typeof countWithSamplesSchema>;
  readonly lowContrastText: z.infer<typeof countWithSamplesSchema>;
  readonly smallTapTargets: z.infer<typeof countWithSamplesSchema>;
}

async function measureRouteLook(
  driver: BandSessionDriver,
  target: RouteTarget,
  memberColours: readonly string[],
): Promise<RouteLook> {
  await driver.open(target.url);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  return {
    route: target.route,
    fontSizes: z.array(z.string()).parse(await driver.session.evaluate(READ_FONT_SIZES)),
    memberColouredText: countWithSamplesSchema.parse(
      await driver.session.evaluate(READ_MEMBER_COLOURED_TEXT, memberColours),
    ),
    lowContrastText: countWithSamplesSchema.parse(
      await driver.session.evaluate(READ_LOW_CONTRAST_TEXT, MINIMUM_TEXT_CONTRAST),
    ),
    smallTapTargets: countWithSamplesSchema.parse(
      await driver.session.evaluate(COUNT_SMALL_TAP_TARGETS, MINIMUM_TAP_TARGET_PX),
    ),
  };
}

async function readOpenSheet(driver: BandSessionDriver): Promise<z.infer<typeof openSheetSchema>> {
  await waitMilliseconds(SHEET_SETTLE_MS);
  return openSheetSchema.parse(await driver.session.evaluate(READ_OPEN_SHEET));
}

async function measureSheets(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const sheets: Record<string, unknown> = {};
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const walk = new TaskWalk(driver.session, 'sheets');
  await walk.tap('Open entry 02', { text: SECOND_ENTRY_PATTERN, css: 'main button' });
  sheets.entry = await readOpenSheet(driver);
  await walk.tap('Lineup (this set)', { text: '^Lineup', css: 'button', scope: 'dialog' });
  sheets.lineup = await readOpenSheet(driver);
  pressKey('Escape');
  await waitMilliseconds(SHEET_SETTLE_MS);
  await walk.tap('Add song', { exact: 'Add song', css: 'button', scope: 'page' });
  sheets.songPicker = await readOpenSheet(driver);
  pressKey('Escape');
  await waitMilliseconds(SHEET_SETTLE_MS);
  await walk.tap('Transition between 04 and 05', {
    exact: 'View / comment the transition',
    css: 'button',
    index: TRANSITION_INDEX,
    scope: 'page',
  });
  sheets.transition = await readOpenSheet(driver);
  pressKey('Escape');
  const measured = Object.values(sheets).map((sheet) => openSheetSchema.parse(sheet));
  return {
    sheets,
    focusOnCancelOrCloseWithField: measured.filter(
      (sheet) => sheet.holdsField && sheet.isFocusOnCancelOrClose,
    ).length,
    sheetsWithInnerVerticalScroll: measured.filter((sheet) => sheet.innerVerticalScrollAreas > 0)
      .length,
  };
}

async function readSecondEntryNotes(driver: BandSessionDriver): Promise<string | null> {
  const known = await driver.readKnownRecords();
  const second = (await driver.listEntries(known.main.id))[1];
  return entryNotesSchema.parse(second ?? {}).notes ?? null;
}

async function runNoteRace(driver: BandSessionDriver, seed: number): Promise<unknown> {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const delays = buildDelaySequence(seed, NOTE_RACE_TEXT.length, NOTE_RACE_MAXIMUM_DELAY_MS);
  const requests: number[] = [];
  const stopListening = driver.session.listen('Fetch.requestPaused', (parameters) => {
    const paused = pausedRequestSchema.parse(parameters);
    const isSave = paused.request.method === 'PUT';
    const delay = isSave ? (delays[requests.length % delays.length] ?? 0) : 0;
    if (isSave) requests.push(delay);
    setTimeout(() => {
      void driver.session.send('Fetch.continueRequest', { requestId: paused.requestId });
    }, delay);
  });
  await driver.session.send('Fetch.enable', {
    patterns: [{ urlPattern: ENTRY_SAVE_URL_PATTERN, requestStage: 'Request' }],
  });
  const walk = new TaskWalk(driver.session, `note race ${String(seed)}`);
  await walk.tap('Open entry 02', { text: SECOND_ENTRY_PATTERN, css: 'main button' });
  await walk.tap('Notes field', { css: 'textarea', scope: 'dialog' });
  await walk.type('Entry note', NOTE_RACE_TEXT);
  const shown = z
    .string()
    .nullable()
    .parse(await driver.session.evaluate(READ_OPEN_TEXTAREA_VALUE));
  await waitMilliseconds(NOTE_RACE_SETTLE_MS);
  await driver.session.send('Fetch.disable');
  stopListening();
  return { seed, requests: requests.length, shown, stored: await readSecondEntryNotes(driver) };
}

async function measureNoteRace(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const runs: { stored: string | null; shown: string | null }[] = [];
  for (let run = 0; run < NOTE_RACE_RUNS; run += 1) {
    runs.push(
      z
        .object({ stored: z.string().nullable(), shown: z.string().nullable() })
        .passthrough()
        .parse(await runNoteRace(driver, FIRST_SEED + run)),
    );
  }
  return { runs, fullTextRuns: countFullTextRuns(runs), totalRuns: NOTE_RACE_RUNS };
}

async function measureTransitionDraft(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const walk = new TaskWalk(driver.session, 'transition draft');
  const transitionSpec = {
    exact: 'View / comment the transition',
    css: 'button',
    index: TRANSITION_INDEX,
    scope: 'page',
  };
  await walk.tap('Transition between 04 and 05', transitionSpec);
  await walk.tap('Note field', { css: 'textarea', scope: 'dialog' });
  await walk.type('Transition draft', TRANSITION_DRAFT_TEXT);
  const backdrop = pointSchema.nullable().parse(await driver.session.evaluate(FIND_BACKDROP_POINT));
  if (backdrop === null) return { isDraftKept: false, note: 'no backdrop area to tap' };
  tapAt(backdrop);
  await waitMilliseconds(SHEET_SETTLE_MS);
  const isClosed = (await walk.readLocation()).overlay === null;
  await walk.tap('Transition between 04 and 05 again', transitionSpec);
  await waitMilliseconds(SHEET_SETTLE_MS);
  const value = z
    .string()
    .nullable()
    .parse(await driver.session.evaluate(READ_OPEN_TEXTAREA_VALUE));
  return {
    isClosedByBackdropTap: isClosed,
    valueOnReopening: value,
    isDraftKept: value?.includes(TRANSITION_DRAFT_TEXT) ?? false,
  };
}

async function measureSetlistScreen(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const firstScreen = await driver.session.evaluate(READ_SETLIST_FIRST_SCREEN);
  const atStart = stripPositionSchema.parse(
    await driver.session.evaluate(READ_PRIMARY_STRIP_POSITION, ADD_SONG_NAMES),
  );
  await driver.session.evaluate(SCROLL_TO_PAGE_END);
  await waitMilliseconds(PAGE_END_SETTLE_MS);
  const atEnd = stripPositionSchema.parse(
    await driver.session.evaluate(READ_PRIMARY_STRIP_POSITION, ADD_SONG_NAMES),
  );
  return { firstScreen, addSongAtStart: atStart, addSongAtPageEnd: atEnd };
}

export async function measureSliceOne(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  driver.reseed();
  await driver.signOut();
  await driver.signIn();
  const memberColours = await readMemberColours(driver);
  const { routes } = await buildSignedInRoutePlan(driver);
  const looks: RouteLook[] = [];
  for (const target of routes) looks.push(await measureRouteLook(driver, target, memberColours));
  const distinctFontSizes = listDistinctFontSizes(looks);
  return {
    totals: {
      distinctFontSizesOutsideSceneViews: distinctFontSizes.length,
      textSetInMemberColour: sumCounts(looks.map((look) => look.memberColouredText.count)),
      textPairsUnderMinimumContrast: sumCounts(looks.map((look) => look.lowContrastText.count)),
      tapTargetsUnder44: sumCounts(looks.map((look) => look.smallTapTargets.count)),
    },
    distinctFontSizes,
    routes: looks,
    sheets: await measureSheets(driver),
    transitionDraft: await measureTransitionDraft(driver),
    noteRace: await measureNoteRace(driver),
    setlistScreen: await measureSetlistScreen(driver),
  };
}
