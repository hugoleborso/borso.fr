import type { APIRequestContext, Page } from 'playwright';
import type { JourneyDriver } from './journey-driver.setup';
import type { JourneyBudget } from './task-speed.core';

export interface JourneyContext {
  readonly page: Page;
  readonly driver: JourneyDriver;
  readonly memberName: string;
}

export interface Journey {
  readonly id: string;
  readonly title: string;
  readonly budget: JourneyBudget;
  readonly prepare?: (request: APIRequestContext) => Promise<void>;
  readonly run: (context: JourneyContext) => Promise<void>;
}

const NEW_SONG_TITLE = 'Seven Nation Army';
const NEW_SONG_ARTIST = 'The White Stripes';
const SEARCHED_SONG = 'Last Call';
const SEARCH_PREFIX = 'last';
const SEARCH_OPENER_NAME = /^Search$/;
const PICKED_SONG_PREFIX = 'seven';
const NEW_TASK_TITLE = 'Change the snare skin';
const NEW_BAR_NAME = 'Le Supersonic';
const SEEDED_SETLIST_NAME = 'Set principal';
const VOTE_TARGET_SONG_COUNT = 5;
const SCENE_ROUTE_SUFFIX = '/scene';

function bottomTab(page: Page, name: string) {
  return page.getByRole('navigation', { name: 'Main sections' }).getByRole('link', { name });
}

interface SeededSetlist {
  readonly id: string;
  readonly name: string;
}

function isSetlistList(value: unknown): value is { setlists: SeededSetlist[] } {
  return typeof value === 'object' && value !== null && 'setlists' in value;
}

async function openVoteOnSeededSetlist(request: APIRequestContext): Promise<void> {
  const listed: unknown = await (await request.get('/api/setlists')).json();
  const setlist = isSetlistList(listed)
    ? listed.setlists.find((candidate) => candidate.name === SEEDED_SETLIST_NAME)
    : undefined;
  if (setlist === undefined) throw new Error('seeded setlist missing');
  await request.put(`/api/setlists/${setlist.id}/vote-status`, {
    data: { status: 'voting', targetSongCount: VOTE_TARGET_SONG_COUNT },
  });
}

async function addSongOutsideTheSetlist(request: APIRequestContext): Promise<void> {
  await request.post('/api/songs', {
    data: { title: NEW_SONG_TITLE, artist: NEW_SONG_ARTIST, status: 'rehearsed' },
  });
}

function nextConcertAction(page: Page, name: string) {
  return page.getByRole('region', { name: 'Next concert' }).getByRole('link', { name });
}

function memberFilterTab(page: Page, memberName: string) {
  return page
    .getByRole('tablist', { name: 'Filter by member' })
    .getByRole('tab', { name: new RegExp(memberName) });
}

export const JOURNEYS: readonly Journey[] = [
  {
    id: 'add-song',
    title: 'Add a song to the catalog',
    budget: { taps: 4, huntedTaps: 0, modelledSeconds: 20 },
    run: async ({ page, driver }) => {
      await driver.tap(page.getByRole('link', { name: 'New song' }), 'New song');
      await driver.type(page.getByLabel('Title', { exact: true }), NEW_SONG_TITLE, 'title');
      await driver.type(page.getByLabel('Artist', { exact: true }), NEW_SONG_ARTIST, 'artist');
      await driver.tap(page.getByRole('button', { name: 'Save' }), 'Save');
      await page.getByRole('heading', { name: NEW_SONG_TITLE }).waitFor();
    },
  },
  {
    id: 'my-part',
    title: 'See what I play at the next concert',
    budget: { taps: 3, huntedTaps: 0, modelledSeconds: 9 },
    run: async ({ page, driver, memberName }) => {
      await driver.tap(nextConcertAction(page, 'My part'), 'My part');
      await memberFilterTab(page, memberName).and(page.locator('[aria-selected="true"]')).waitFor();
    },
  },
  {
    id: 'vote',
    title: 'Give points in the open setlist vote',
    budget: { taps: 3, huntedTaps: 0, modelledSeconds: 9 },
    prepare: openVoteOnSeededSetlist,
    run: async ({ page, driver }) => {
      await driver.tap(nextConcertAction(page, 'Vote now'), 'Vote now');
      await driver.tap(page.getByRole('button', { name: /^Score / }).first(), 'score a song');
    },
  },
  {
    id: 'stage',
    title: 'Open the next concert on stage',
    budget: { taps: 3, huntedTaps: 0, modelledSeconds: 9 },
    run: async ({ page, driver }) => {
      await driver.tap(nextConcertAction(page, 'Stage'), 'Stage');
      await page.waitForURL((url) => url.pathname.endsWith(SCENE_ROUTE_SUFFIX));
    },
  },
  {
    id: 'find-chart',
    title: "Open a song's chord chart",
    budget: { taps: 3, huntedTaps: 0, modelledSeconds: 9 },
    run: async ({ page, driver }) => {
      const searchField = page.getByRole('searchbox').first();
      if (!(await searchField.isVisible())) {
        await driver.tap(page.getByRole('button', { name: SEARCH_OPENER_NAME }), 'open search');
      }
      await driver.type(searchField, SEARCH_PREFIX, 'search');
      await driver.tap(page.getByRole('link', { name: new RegExp(SEARCHED_SONG) }).first(), 'song');
      await page
        .getByText(/chord chart/i)
        .first()
        .waitFor();
    },
  },
  {
    id: 'add-to-setlist',
    title: 'Add a catalog song to the next concert setlist',
    prepare: addSongOutsideTheSetlist,
    budget: { taps: 5, huntedTaps: 0, modelledSeconds: 14 },
    run: async ({ page, driver }) => {
      await driver.tap(nextConcertAction(page, 'My part'), 'My part');
      await driver.tap(page.getByRole('button', { name: 'Add song' }).first(), 'Add song');
      await driver.type(
        page.getByRole('dialog').getByRole('searchbox'),
        PICKED_SONG_PREFIX,
        'search',
      );
      await driver.tap(
        page
          .getByRole('dialog')
          .getByRole('button', { name: new RegExp(NEW_SONG_TITLE) })
          .first(),
        'pick',
      );
    },
  },
  {
    id: 'add-task',
    title: 'Write down a task',
    budget: { taps: 4, huntedTaps: 0, modelledSeconds: 14 },
    run: async ({ page, driver }) => {
      await driver.tap(page.getByRole('button', { name: 'More' }), 'More tab');
      await driver.tap(page.getByRole('link', { name: 'Tasks' }), 'Tasks');
      await driver.type(page.getByPlaceholder('New task'), NEW_TASK_TITLE, 'title');
      await driver.tap(page.getByRole('button', { name: 'Add', exact: true }), 'Add');
      await page.getByText(NEW_TASK_TITLE).first().waitFor();
    },
  },
  {
    id: 'add-bar',
    title: 'Log a new bar lead',
    budget: { taps: 4, huntedTaps: 0, modelledSeconds: 12 },
    run: async ({ page, driver }) => {
      await driver.tap(bottomTab(page, 'Bars'), 'Bars tab');
      await driver.type(page.getByPlaceholder('New bar'), NEW_BAR_NAME, 'name');
      await driver.tap(page.getByRole('button', { name: 'Add', exact: true }), 'Add');
      await page.getByText(NEW_BAR_NAME).first().waitFor();
    },
  },
];
