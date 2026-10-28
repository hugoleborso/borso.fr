import { z } from 'zod';
import type { BandSessionDriver } from './band-session.setup';
import {
  COUNT_BUTTONS_INSIDE_LINKS,
  COUNT_LISTEN_LINKS,
  COUNT_STAGE_MODE_WAYS,
} from './page-probes.setup';
import { buildSignedInRoutePlan } from './route-measures.setup';
import { readScrollAreas, waitMilliseconds } from './walk-recorder.setup';

const ROUTE_SETTLE_MS = 900;

const listenSongSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    deezerTrackId: z.string().nullable().optional(),
    spotifyTrackId: z.string().nullable().optional(),
    links: z.array(z.object({ url: z.string() })).optional(),
  })
  .passthrough();

function countSongLinks(song: z.infer<typeof listenSongSchema>): number {
  const addresses = new Set((song.links ?? []).map((link) => link.url));
  const trackIds = [song.deezerTrackId, song.spotifyTrackId].filter(
    (trackId) => typeof trackId === 'string' && trackId.trim().length > 0,
  );
  return addresses.size + trackIds.length;
}

async function measureOpenedRoute(driver: BandSessionDriver, url: string): Promise<void> {
  await driver.open(url);
  await waitMilliseconds(ROUTE_SETTLE_MS);
}

async function countButtonsInsideLinks(driver: BandSessionDriver): Promise<Record<string, number>> {
  const plan = await buildSignedInRoutePlan(driver);
  const places: Record<string, number> = {};
  for (const target of plan.routes) {
    await measureOpenedRoute(driver, target.url);
    const count = z.number().parse(await driver.session.evaluate(COUNT_BUTTONS_INSIDE_LINKS));
    if (count > 0) places[target.route] = count;
  }
  return places;
}

async function measureListenLinks(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const songs = await driver.listFrom('/api/songs', 'songs', listenSongSchema);
  const measured: Record<string, unknown>[] = [];
  for (const song of songs.filter((candidate) => countSongLinks(candidate) > 0)) {
    await measureOpenedRoute(driver, `/catalog/${song.id}`);
    measured.push({
      title: song.title,
      linksTheSongHas: countSongLinks(song),
      listenLinksShown: z.number().parse(await driver.session.evaluate(COUNT_LISTEN_LINKS)),
    });
  }
  return { songsWithLinks: measured.length, songs: measured };
}

export async function measureSliceSix(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const known = await driver.startFresh('/catalog');
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const catalogue = await readScrollAreas(driver.session);
  const chartSong = known.songs.find((song) => Boolean(song.chart)) ?? known.songs[0];
  if (chartSong === undefined) throw new Error('no song in the seed');
  await measureOpenedRoute(driver, `/catalog/${chartSong.id}`);
  const stageModeWays = z.number().parse(await driver.session.evaluate(COUNT_STAGE_MODE_WAYS));
  await measureOpenedRoute(driver, `/catalog/${chartSong.id}/edit`);
  const editScrollAreas = await readScrollAreas(driver.session);
  return {
    catalogPageHeightInScreens: catalogue.pageHeightInScreens,
    songUsed: chartSong.title,
    stageModeWaysFromSongPage: stageModeWays,
    editRouteVerticalScrollAreas: editScrollAreas.vertical,
    buttonsInsideLinksByRoute: await countButtonsInsideLinks(driver),
    listenLinks: await measureListenLinks(driver),
  };
}
