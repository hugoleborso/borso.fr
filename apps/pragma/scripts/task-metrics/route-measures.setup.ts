import { z } from 'zod';
import type { BandSessionDriver } from './band-session.setup';
import { COUNT_BUTTONS, READ_PATHNAME } from './page-probes.setup';
import { readScrollAreas, waitMilliseconds } from './walk-recorder.setup';

const ROUTE_SETTLE_MS = 600;
const SIGNED_OUT_ROUTES = ['/login', '/recover', '/vote'];

const buttonEntrySchema = z.object({
  name: z.string(),
  hasName: z.boolean(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
const buttonGroupSchema = z.object({
  iconOnly: z.array(buttonEntrySchema),
  textOnly: z.array(buttonEntrySchema),
  iconAndText: z.array(buttonEntrySchema),
  neither: z.array(buttonEntrySchema),
  total: z.number(),
});
const buttonCountSchema = z.object({ button: buttonGroupSchema, link: buttonGroupSchema });

export type ButtonCount = z.infer<typeof buttonCountSchema>;

export interface RouteTarget {
  readonly route: string;
  readonly url: string;
}

function summariseGroup(group: z.infer<typeof buttonGroupSchema>): Record<string, number> {
  return {
    total: group.total,
    iconOnly: group.iconOnly.length,
    textNoIcon: group.textOnly.length,
    iconAndText: group.iconAndText.length,
    noTextNoIcon: group.neither.length,
  };
}

export async function readButtonCount(driver: BandSessionDriver): Promise<ButtonCount> {
  return buttonCountSchema.parse(await driver.session.evaluate(COUNT_BUTTONS));
}

async function measureRoute(
  driver: BandSessionDriver,
  target: RouteTarget,
): Promise<Record<string, unknown>> {
  await driver.open(target.url);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const landedOn = String(await driver.session.evaluate(READ_PATHNAME));
  const areas = await readScrollAreas(driver.session);
  const buttons = await readButtonCount(driver);
  console.log(
    `[route] ${target.route} -> ${landedOn} v=${String(areas.vertical)} h=${String(areas.horizontal)} iconOnly=${String(buttons.button.iconOnly.length)}+${String(buttons.link.iconOnly.length)}`,
  );
  return {
    route: target.route,
    url: target.url,
    landedOn,
    verticalScrollAreas: areas.vertical,
    horizontalScrollAreas: areas.horizontal,
    documentScrolls: areas.documentScrolls,
    pageHeightInScreens: areas.pageHeightInScreens,
    layoutWidth: areas.layoutWidth,
    scrollContainers: areas.containers.map(
      (area) =>
        `${area.axis} ${area.tag} [${area.box.join(',')}] ${String(area.scrollHeight)}/${String(area.clientHeight)}`,
    ),
    buttons: summariseGroup(buttons.button),
    links: summariseGroup(buttons.link),
    noTextNoIconButtons: buttons.button.neither.map(
      (entry) => entry.name || '(no accessible name)',
    ),
    iconOnlyButtons: buttons.button.iconOnly.map((entry) => entry.name),
    iconOnlyLinks: buttons.link.iconOnly.map((entry) => entry.name),
    iconOnlyButtonsWithoutName: buttons.button.iconOnly.filter((entry) => !entry.hasName).length,
    textOnlyButtonNames: buttons.button.textOnly.map((entry) => entry.name),
  };
}

export async function buildSignedInRoutePlan(driver: BandSessionDriver): Promise<{
  readonly songUsed: string;
  readonly routes: readonly RouteTarget[];
}> {
  const known = await driver.readKnownRecords();
  const chartSong =
    known.songs.find((song) => song.title === 'Afterglow' && Boolean(song.chart)) ??
    known.songs.find((song) => Boolean(song.chart));
  if (chartSong === undefined) throw new Error('no song with a chart in the seed');
  const pastPractice = known.sessions.find((session) => session.kind === 'practice');
  const concertId = known.concert.id;
  return {
    songUsed: chartSong.title,
    routes: [
      { route: '/vote/:sessionId', url: `/vote/${concertId}` },
      { route: '/', url: '/' },
      { route: '/catalog', url: '/catalog' },
      { route: '/catalog/new', url: '/catalog/new' },
      { route: '/catalog/:songId', url: `/catalog/${chartSong.id}` },
      { route: '/catalog/:songId/edit', url: `/catalog/${chartSong.id}/edit` },
      { route: '/catalog/:songId/scene', url: `/catalog/${chartSong.id}/scene` },
      { route: '/sessions', url: '/sessions' },
      { route: '/sessions/:sessionId (concert)', url: `/sessions/${concertId}` },
      {
        route: '/sessions/:sessionId (practice)',
        url: `/sessions/${pastPractice?.id ?? concertId}`,
      },
      { route: '/sessions/:sessionId/setlist', url: `/sessions/${concertId}/setlist` },
      { route: '/setlists', url: '/setlists' },
      { route: '/setlists/:setlistId', url: `/setlists/${known.main.id}` },
      { route: '/setlists/:setlistId/vote', url: `/setlists/${known.rehearsal.id}/vote` },
      { route: '/setlists/:setlistId/audience', url: `/setlists/${known.main.id}/audience` },
      { route: '/setlists/:setlistId/scene', url: `/setlists/${known.main.id}/scene` },
      { route: '/bars', url: '/bars' },
      { route: '/improvements', url: '/improvements' },
      { route: '/studies', url: '/studies' },
      { route: '/band', url: '/band' },
      { route: '/tasks', url: '/tasks' },
      { route: '/compos', url: '/compos' },
      { route: '/members', url: '/members' },
      { route: '/instruments', url: '/instruments' },
      { route: '/account', url: '/account' },
    ],
  };
}

export async function measureRoutes(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const measured: Record<string, unknown>[] = [];
  driver.reseed();
  await driver.signOut();
  for (const route of SIGNED_OUT_ROUTES) {
    measured.push(await measureRoute(driver, { route, url: route }));
  }
  await driver.signIn();
  const { songUsed, routes } = await buildSignedInRoutePlan(driver);
  for (const target of routes) measured.push(await measureRoute(driver, target));
  return { songUsed, routes: measured };
}
