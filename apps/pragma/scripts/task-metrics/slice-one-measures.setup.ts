import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  type ColourScheme,
  measureContrastOnFill,
  measureFillContrast,
  readThemeTokens,
} from '../../site/src/lib/design-tokens.utils';
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
  READ_COVERED_TEXT,
  SCROLL_TO_PAGE_END,
} from './page-probes.setup';
import { buildSignedInRoutePlan, type RouteTarget } from './route-measures.setup';
import {
  buildDelaySequence,
  countFullTextRuns,
  listDistinctFontSizes,
  sumCounts,
  sumSchemeCounts,
  type RouteFontSizes,
} from './task-metrics.core';
import { PHONE, readScrollAreas, TaskWalk, waitMilliseconds } from './walk-recorder.setup';

const MINIMUM_TAP_TARGET_PX = 44;
const MINIMUM_TEXT_CONTRAST = 4.5;
const ROUTE_SETTLE_MS = 600;
const SHEET_SETTLE_MS = 700;
const SCHEME_SETTLE_MS = 300;
const LAYOUT_WIDTHS = [
  { width: 375, height: 812, mobile: true },
  { width: 1280, height: 900, mobile: false },
] as const;
const LAYOUT_DEVICE_SCALE_FACTOR = 1;
const NOTE_RACE_RUNS = 8;
const NOTE_RACE_TEXT = 'Finir sur le refrain ok';
const NOTE_RACE_MAXIMUM_DELAY_MS = 700;
const NOTE_RACE_SETTLE_MS = 6000;
const TRANSITION_DRAFT_TEXT = 'Brouillon de transition';
const TRANSITION_INDEX = 3;
const SECOND_ENTRY_PATTERN = '^02 ';
const TRANSITION_LINE = 'main [data-transition-line]';
const ENTRY_SAVE_URL_PATTERN = '*/api/setlists/*/entries/*';
const ADD_SONG_NAMES = ['Add song', 'Add songs'];
const PAGE_END_SETTLE_MS = 800;
const FIRST_SEED = 1;
const TOKENS_STYLESHEET = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../site/src/styles/tokens.css',
);
const COLOUR_SCHEMES: readonly ColourScheme[] = ['light', 'dark'];
const PILL_BACKGROUNDS = ['paper', 'leaf', 'raised'];
const SECONDARY_PILL_FILL = 'glass';
const RATIO_DECIMALS = 2;

function roundRatio(ratio: number | null): number | null {
  return ratio === null ? null : Number(ratio.toFixed(RATIO_DECIMALS));
}

function measureSecondaryPill(): Record<string, unknown> {
  const tokens = readThemeTokens(readFileSync(TOKENS_STYLESHEET, 'utf8'));
  return Object.fromEntries(
    COLOUR_SCHEMES.map((scheme) => [
      scheme,
      Object.fromEntries(
        PILL_BACKGROUNDS.map((background) => [
          background,
          {
            fillAgainstBackground: roundRatio(
              measureFillContrast(tokens, SECONDARY_PILL_FILL, background, scheme),
            ),
            inkLabelOnFill: roundRatio(
              measureContrastOnFill(tokens, 'ink', SECONDARY_PILL_FILL, background, scheme),
            ),
            accentIconOnFill: roundRatio(
              measureContrastOnFill(tokens, 'accent', SECONDARY_PILL_FILL, background, scheme),
            ),
          },
        ]),
      ),
    ]),
  );
}

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

type CountWithSamples = z.infer<typeof countWithSamplesSchema>;
type PerScheme<Measure> = Readonly<Record<ColourScheme, Measure>>;

interface RouteLook extends RouteFontSizes {
  readonly memberColouredText: PerScheme<CountWithSamples>;
  readonly lowContrastText: PerScheme<CountWithSamples>;
  readonly smallTapTargets: CountWithSamples;
}

async function emulateColourScheme(driver: BandSessionDriver, scheme: ColourScheme): Promise<void> {
  await driver.session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: scheme }],
  });
  await waitMilliseconds(SCHEME_SETTLE_MS);
}

async function measureSchemeColours(
  driver: BandSessionDriver,
  memberColours: readonly string[],
): Promise<{ memberColouredText: CountWithSamples; lowContrastText: CountWithSamples }> {
  return {
    memberColouredText: countWithSamplesSchema.parse(
      await driver.session.evaluate(READ_MEMBER_COLOURED_TEXT, memberColours),
    ),
    lowContrastText: countWithSamplesSchema.parse(
      await driver.session.evaluate(READ_LOW_CONTRAST_TEXT, MINIMUM_TEXT_CONTRAST),
    ),
  };
}

async function measureRouteLook(
  driver: BandSessionDriver,
  target: RouteTarget,
  memberColours: readonly string[],
): Promise<RouteLook> {
  await driver.open(target.url);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const fontSizes = z.array(z.string()).parse(await driver.session.evaluate(READ_FONT_SIZES));
  const smallTapTargets = countWithSamplesSchema.parse(
    await driver.session.evaluate(COUNT_SMALL_TAP_TARGETS, MINIMUM_TAP_TARGET_PX),
  );
  const light = await measureSchemeColours(driver, memberColours);
  await emulateColourScheme(driver, 'dark');
  let dark: Awaited<ReturnType<typeof measureSchemeColours>>;
  try {
    dark = await measureSchemeColours(driver, memberColours);
  } finally {
    await emulateColourScheme(driver, 'light');
  }
  return {
    route: target.route,
    fontSizes,
    memberColouredText: { light: light.memberColouredText, dark: dark.memberColouredText },
    lowContrastText: { light: light.lowContrastText, dark: dark.lowContrastText },
    smallTapTargets,
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
  pressKey('Escape');
  await waitMilliseconds(SHEET_SETTLE_MS);
  await walk.tap('Lineup view', { exact: 'Lineup', css: '[role=tab]', scope: 'page' });
  await walk.tap('Lineup cell of entry 02', {
    within: { css: '[data-lineup-row]', text: SECOND_ENTRY_PATTERN },
    css: '[data-lineup-cell]',
    scope: 'page',
  });
  sheets.lineup = await readOpenSheet(driver);
  pressKey('Escape');
  await waitMilliseconds(SHEET_SETTLE_MS);
  await walk.tap('Songs view', { exact: 'Songs', css: '[role=tab]', scope: 'page' });
  await walk.tap('Add song', { exact: 'Add song', css: 'button', scope: 'page' });
  sheets.songPicker = await readOpenSheet(driver);
  pressKey('Escape');
  await waitMilliseconds(SHEET_SETTLE_MS);
  await walk.tap('Transition between 04 and 05', {
    css: TRANSITION_LINE,
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
    css: TRANSITION_LINE,
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

async function emulateLayoutWidth(
  driver: BandSessionDriver,
  layout: {
    readonly width: number;
    readonly height: number;
    readonly mobile: boolean;
    readonly deviceScaleFactor?: number;
  },
): Promise<void> {
  await driver.session.send('Emulation.setDeviceMetricsOverride', {
    width: layout.width,
    height: layout.height,
    deviceScaleFactor: layout.deviceScaleFactor ?? LAYOUT_DEVICE_SCALE_FACTOR,
    mobile: layout.mobile,
  });
}

async function measureLayoutAtWidths(
  driver: BandSessionDriver,
  routes: readonly RouteTarget[],
): Promise<Record<string, unknown>> {
  const widths: Record<string, unknown> = {};
  let coveredText = 0;
  let routesScrollingSideways = 0;
  try {
    for (const layout of LAYOUT_WIDTHS) {
      await emulateLayoutWidth(driver, layout);
      const measured: Record<string, unknown>[] = [];
      for (const target of routes) {
        await driver.open(target.url);
        await waitMilliseconds(ROUTE_SETTLE_MS);
        const covered = countWithSamplesSchema.parse(
          await driver.session.evaluate(READ_COVERED_TEXT),
        );
        const isScrollingSideways = (await readScrollAreas(driver.session)).documentScrollsX;
        coveredText += covered.count;
        if (isScrollingSideways) routesScrollingSideways += 1;
        measured.push({
          route: target.route,
          coveredText: covered,
          isScrollingSideways,
        });
      }
      widths[String(layout.width)] = measured;
    }
  } finally {
    await emulateLayoutWidth(driver, {
      width: PHONE.width,
      height: PHONE.height,
      mobile: true,
      deviceScaleFactor: PHONE.deviceScaleFactor,
    });
  }
  return { coveredText, routesScrollingSideways, widths };
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
      textSetInMemberColour: sumSchemeCounts(looks.map((look) => look.memberColouredText)),
      textPairsUnderMinimumContrast: sumSchemeCounts(looks.map((look) => look.lowContrastText)),
      tapTargetsUnder44: sumCounts(looks.map((look) => look.smallTapTargets.count)),
    },
    distinctFontSizes,
    secondaryPill: measureSecondaryPill(),
    routes: looks,
    layoutAtWidths: await measureLayoutAtWidths(driver, routes),
    sheets: await measureSheets(driver),
    transitionDraft: await measureTransitionDraft(driver),
    noteRace: await measureNoteRace(driver),
    setlistScreen: await measureSetlistScreen(driver),
  };
}
