import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { buildTakeObjectKey } from '../../api/src/takes/takes.core';
import { selectNextSession } from '../../domain/session-schedule.core';
import { formatSessionDate } from '../../site/src/lib/formatters.utils';
import type { BandSessionDriver } from './band-session.setup';
import {
  COUNT_LISTEN_LINKS,
  READ_PAGE_HEADING,
  LIST_VISIBLE_BUTTON_NAMES,
  LISTS_A_DURATION,
  MAIN_TEXT_INCLUDES,
  READ_NEXT_SESSION_TEXT,
} from './page-probes.setup';
import { projectScreenFraction, replaceIdentifierInPath } from './task-metrics.core';
import { navigateTo, TaskWalk, waitForMain, waitMilliseconds } from './walk-recorder.setup';

const CREATE_SETTLE_MS = 1200;
const SAVE_SETTLE_MS = 1500;
const PICK_SETTLE_MS = 500;
const CLOSE_SETTLE_MS = 800;
const ENTRY_NUMBER_WIDTH = 2;
const SHOWN_TITLE_COUNT = 8;
const LISTED_BUTTON_COUNT = 12;
const HOME_LOCALE = 'en';
const SECOND_ENTRY = 1;
const SECOND_ENTRY_NUMBER = 2;
const TAB_LINK = 'nav[aria-label="Main sections"] a';
const SECTION_TAB = '[role=tab]';
const HOME = '/';

const anyRecord = z.record(z.unknown());
const songArtistSchema = z.object({ artist: z.string().optional() });

export type TaskWalkRunner = (driver: BandSessionDriver) => Promise<unknown>;

function buildEntryPattern(position: number): string {
  return `^${String(position).padStart(ENTRY_NUMBER_WIDTH, '0')} `;
}

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openSetlistLibrary(walk: TaskWalk): Promise<void> {
  await walk.tap('Sessions tab', { text: '^Sessions', css: TAB_LINK });
  await walk.tap('Setlists section', { exact: 'Setlists', css: SECTION_TAB });
}

function buildPickPattern(title: string): string {
  return `(^| )${escapeForPattern(title)} `;
}

async function pickSongs(walk: TaskWalk, titles: readonly string[]): Promise<void> {
  for (const title of titles) {
    await walk.tap(
      `Pick ${title}`,
      { text: buildPickPattern(title), css: '[role=checkbox]', scope: 'dialog' },
      { wait: PICK_SETTLE_MS },
    );
  }
}

async function pickSongsWithoutScrolling(walk: TaskWalk, titles: readonly string[]): Promise<void> {
  for (const title of titles) {
    const row = { text: buildPickPattern(title), css: '[role=checkbox]', scope: 'dialog' } as const;
    const shown = await walk.find(row);
    if (shown === null || !shown.inView) await walk.type('Search', title);
    await walk.tap(`Pick ${title}`, row, { wait: PICK_SETTLE_MS });
  }
}

async function confirmAddSongs(walk: TaskWalk, count: number): Promise<void> {
  await walk.tap(
    `Add ${String(count)} songs`,
    { text: `^Add ${String(count)} song`, css: 'button', scope: 'dialog' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
}

async function openAddSongs(walk: TaskWalk): Promise<void> {
  await walk.tap(
    'Add songs',
    { exact: 'Add songs', css: 'button', scope: 'page' },
    { primary: true, wait: PICK_SETTLE_MS },
  );
}

async function openNextSetlistFromHome(walk: TaskWalk): Promise<void> {
  await walk.tap(
    'Open the setlist',
    { exact: 'Open the setlist', css: 'a, button', scope: 'page' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
}

async function isTextInMain(driver: BandSessionDriver, needle: string): Promise<boolean> {
  await waitForMain(driver.session);
  return (await driver.session.evaluate(MAIN_TEXT_INCLUDES, needle)) === true;
}

const prepareNextRehearsal: TaskWalkRunner = async (driver) => {
  const before = await driver.startFresh(HOME);
  const walk = new TaskWalk(driver.session, '1 Prepare the next rehearsal');
  await walk.tap('Sessions tab', { text: '^Sessions', css: TAB_LINK });
  await walk.tap('New practice', { exact: 'Practice', css: 'button' }, { primary: true });
  await walk.tap('Create session', { exact: 'Create', css: 'button' }, { wait: CREATE_SETTLE_MS });
  walk.note(
    'The new session has no setlist, so its bottom strip offers Add a setlist, which creates a setlist named after the session and opens the Add songs sheet.',
  );
  await walk.tap(
    'Add a setlist',
    { exact: 'Add a setlist', css: 'button', scope: 'page' },
    { primary: true, wait: PICK_SETTLE_MS },
  );
  const picks = [
    'Afterglow',
    'Billie Jean',
    'Come Together',
    'Dreams',
    'Get Lucky',
    'Hey Ya!',
    'Jolene',
    'Last Call',
    'Lightning',
    'Midnight Drive',
  ];
  walk.note(
    'A song already on the screen is tapped; any other is typed into the search, which a pick empties, as the spec happy path says: search or a chip instead of scrolling.',
  );
  await pickSongsWithoutScrolling(walk, picks);
  await confirmAddSongs(walk, picks.length);
  walk.note(
    `After Add 10 songs the screen is ${replaceIdentifierInPath((await walk.readLocation()).path)}.`,
  );
  const known = await driver.readKnownRecords();
  const knownIds = new Set(before.setlists.map((setlist) => setlist.id));
  const made = known.setlists.find((setlist) => !knownIds.has(setlist.id));
  const list = made === undefined ? [] : await driver.listEntries(made.id);
  return walk.summarise({
    success: {
      practices: known.sessions.filter((session) => session.kind === 'practice').length,
      newSetlistName: made?.name ?? null,
      newSetlistAttachedTo: made?.sessionIds?.length ?? 0,
      newSetlistSongs: list.map((entry) => entry.title),
    },
  });
};

const buildConcertSetlist: TaskWalkRunner = async (driver) => {
  const known = await driver.startFresh(HOME);
  const before = await driver.listEntries(known.main.id);
  const walk = new TaskWalk(driver.session, '2 Build the concert setlist');
  await openSetlistLibrary(walk);
  await walk.tap(
    'Open Set principal',
    { text: '^Set principal', css: 'main a' },
    { wait: CREATE_SETTLE_MS },
  );
  await openAddSongs(walk);
  await pickSongs(walk, ['Dreams']);
  walk.note('A pick keeps the focus in the search, so the next title is typed with no tap.');
  await walk.type('Search', 'Psycho');
  await pickSongs(walk, ['Psycho Killer']);
  await confirmAddSongs(walk, CONCERT_PICK_COUNT);
  await walk.tap('More for entry 03', { css: 'main li summary', index: 2, scope: 'page' });
  await walk.tap(
    'Remove from the setlist',
    { exact: 'Remove from the setlist', css: 'main li details[open] button', scope: 'page' },
    { primary: true },
  );
  await walk.tap(
    'Order',
    { exact: 'Order', css: 'a, button', scope: 'page' },
    { wait: CREATE_SETTLE_MS },
  );
  await walk.drag(
    'Drag entry 05 to position 02',
    { exact: 'Drag to reorder', css: 'button', index: 4, scope: 'page' },
    { exact: 'Drag to reorder', css: 'button', index: 1, scope: 'page' },
  );
  walk.note('The order saves on the drop, so the walk ends on the Order screen without Done.');
  await waitMilliseconds(SAVE_SETTLE_MS);
  await driver.open(`/setlists/${known.main.id}`);
  const after = await driver.listEntries(known.main.id);
  return walk.summarise({
    success: {
      before: before.map((entry) => entry.title),
      afterReload: after.map((entry) => entry.title),
    },
  });
};

const agreeWhoDoesWhat: TaskWalkRunner = async (driver) => {
  await driver.startFresh(HOME);
  const walk = new TaskWalk(driver.session, '3 Agree who does what');
  await walk.tap(
    'Next session',
    { css: 'section[aria-label="Next session"] a', scope: 'page' },
    { wait: CREATE_SETTLE_MS },
  );
  await walk.tap('Tasks tab', { exact: 'Tasks', css: '[role=tab]', scope: 'page' });
  walk.note(
    'Operator review 2 put the session page behind tabs (Setlist, Tasks, Takes, Details), so Who does what is one tab away.',
  );
  await walk.tap('Add a task', { exact: 'Add a task', css: 'button', scope: 'page' });
  walk.note(
    'The task sheet opens with its title field focused and already linked to the session, so typing needs no tap.',
  );
  await walk.type('Task title', 'Imprimer les setlists');
  await walk.tap('Assignee Léa', { text: 'Léa$', css: 'form button', scope: 'dialog' });
  await walk.choose('Linked song', '#task-song', '~Nuit blanche');
  walk.note('The song list of a task offers every catalogue song, not only the compositions.');
  await walk.choose('Due date', '#task-due', '2026-11-01');
  await walk.tap(
    'Save task',
    { exact: 'Save', css: 'form button[type=submit]', scope: 'dialog' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  const tasks = await driver.listFrom('/api/tasks', 'tasks', anyRecord);
  const made = tasks.find((task) => task.title === 'Imprimer les setlists');
  await navigateTo(driver.session, `${driver.baseUrl}${HOME}`);
  const partB = new TaskWalk(driver.session, '3b See my own tasks');
  await partB.tap('Band tab', { text: '^Band', css: TAB_LINK }, { wait: CREATE_SETTLE_MS });
  const ownSpec = { css: 'ul[aria-label="My tasks"] li button', index: 0, scope: 'page' };
  const firstOwnTask = await partB.find(ownSpec);
  const reach = firstOwnTask === null ? null : await partB.bringIntoView(ownSpec);
  const summary = anyRecord.parse(
    walk.summarise({
      success: {
        taskCreated: made !== undefined,
        assignee: made?.assigneeId ?? null,
        songId: made?.songId ?? null,
        sessionId: made?.sessionId ?? null,
        dueDate: made?.dueDate ?? null,
      },
    }),
  );
  return {
    ...summary,
    partB: {
      ...anyRecord.parse(partB.summarise()),
      firstOwnTaskVisibleOnArrival: reach?.first.inView ?? false,
      firstOwnTaskYFraction: firstOwnTask === null ? null : projectScreenFraction(firstOwnTask),
      firstOwnTask: firstOwnTask?.name ?? null,
      scrollsToReachIt: reach?.scrollsUsed ?? null,
    },
  };
};

const setLineupForOneSong: TaskWalkRunner = async (driver) => {
  const known = await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const before = (await driver.listEntries(known.main.id))[SECOND_ENTRY];
  const walk = new TaskWalk(driver.session, '4 Set the lineup for one song in a setlist');
  await walk.tap(
    'Open entry 02',
    { text: buildEntryPattern(SECOND_ENTRY_NUMBER), css: 'main button' },
    { primary: true },
  );
  await walk.tap('Tom plays Guitare', {
    exact: 'Guitare',
    css: '[aria-label="Tom — Instruments"] button',
    scope: 'dialog',
  });
  await walk.tap('Close the sheet', { exact: 'Close', css: 'button', scope: 'dialog' });
  await waitMilliseconds(CLOSE_SETTLE_MS);
  const after = await walk.readLocation();
  walk.note(
    `After Close the screen is ${replaceIdentifierInPath(after.path)}${after.overlay === null ? ' (the entry sheet is closed)' : ` with ${after.overlay}`}.`,
  );
  const second = (await driver.listEntries(known.main.id))[SECOND_ENTRY];
  return walk.summarise({
    success: {
      entry: second?.title,
      overrideSaved:
        second?.lineupOverride !== null &&
        JSON.stringify(second?.lineupOverride) !== JSON.stringify(before?.lineupOverride),
      songDefaultUnchanged:
        JSON.stringify(second?.songDefaultLineup) === JSON.stringify(before?.songDefaultLineup),
    },
  });
};

const noteTransition: TaskWalkRunner = async (driver) => {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const walk = new TaskWalk(driver.session, '5 Note a transition');
  await walk.tap(
    'Transition line between 04 and 05',
    { css: 'main [data-transition-line]', index: 3 },
    { primary: true },
  );
  await walk.tap('Note field', { css: 'textarea', scope: 'dialog' });
  await walk.type('Transition note', 'Enchainer sans pause, Marc lance la basse');
  await walk.tap('Save', { exact: 'Save', css: 'button', scope: 'dialog' }, { primary: true });
  const isShown = await isTextInMain(driver, 'Enchainer sans pause');
  walk.note(
    isShown
      ? 'The note text is shown on the setlist.'
      : 'The note text is not shown on the setlist after saving (only an icon or nothing).',
  );
  const isSaved = JSON.stringify(await driver.fetchJson('/api/transition-comments')).includes(
    'Enchainer sans pause',
  );
  return walk.summarise({ success: { saved: isSaved, noteTextVisibleOnList: isShown } });
};

const noteSongForTonight: TaskWalkRunner = async (driver) => {
  await driver.startFresh((records) => `/setlists/${records.main.id}`);
  const walk = new TaskWalk(driver.session, '6 Take a note on a song for tonight');
  await walk.tap(
    'Open entry 02',
    { text: buildEntryPattern(SECOND_ENTRY_NUMBER), css: 'main button' },
    { primary: true },
  );
  walk.note(
    'The entry sheet opens with the focus in the note field, so the note is typed with no tap.',
  );
  await walk.type('Entry note', 'Finir sur le refrain');
  await walk.tap('Key field', { css: 'input', index: 0, scope: 'dialog' });
  await walk.type('Key', 'Am');
  await walk.tap('Close the sheet', { exact: 'Close', css: 'button', scope: 'dialog' });
  await waitMilliseconds(CLOSE_SETTLE_MS);
  const isShown = await isTextInMain(driver, 'Finir sur le refrain');
  walk.note(
    isShown
      ? 'The note is shown on the entry row.'
      : 'The note is not shown on the entry row; it is only visible by opening the sheet again.',
  );
  const second = (await driver.listEntries((await driver.readKnownRecords()).main.id))[
    SECOND_ENTRY
  ];
  return walk.summarise({
    success: {
      noteVisibleOnRow: isShown,
      saved: { notes: second?.notes, keyOverride: second?.keyOverride },
    },
  });
};

const STAND_IN_TAKE_SECONDS = 30;
const STAND_IN_CONTENT_TYPE = 'audio/webm';
const practiceSetlistsSchema = z.object({ setlists: z.array(z.object({ id: z.string() })) });
const practiceEntriesSchema = z.object({
  entries: z.array(z.object({ songId: z.string(), position: z.number() })),
});

async function readFirstPracticeSongId(
  driver: BandSessionDriver,
  practiceId: string,
): Promise<string> {
  const { setlists } = practiceSetlistsSchema.parse(
    await driver.fetchJson(`/api/setlists/by-session/${practiceId}`),
  );
  const firstSetlist = setlists[0];
  if (firstSetlist === undefined) throw new Error('[7] the coming practice has no setlist');
  const { entries } = practiceEntriesSchema.parse(
    await driver.fetchJson(`/api/setlists/${firstSetlist.id}/entries`),
  );
  const first = entries.toSorted((left, right) => left.position - right.position)[0];
  if (first === undefined) throw new Error('[7] the practice setlist is empty');
  return first.songId;
}

async function createStandInTake(
  driver: BandSessionDriver,
  songId: string,
  practiceId: string,
): Promise<void> {
  const takeId = randomUUID();
  await driver.postJson('/api/takes', {
    id: takeId,
    objectKey: buildTakeObjectKey({ songId, takeId, contentType: STAND_IN_CONTENT_TYPE }),
    songId,
    sessionId: practiceId,
    recordedAt: new Date().toISOString(),
    durationSeconds: STAND_IN_TAKE_SECONDS,
    contentType: STAND_IN_CONTENT_TYPE,
    source: 'live',
    queued: false,
    fromPracticeMode: true,
  });
}

const recordTakeAndTalk: TaskWalkRunner = async (driver) => {
  await driver.startFresh(HOME);
  const practiceId = await movePracticeToToday(driver);
  if (practiceId === null) throw new Error('[7] no coming practice in the seed');
  await createStandInTake(driver, await readFirstPracticeSongId(driver, practiceId), practiceId);
  await driver.open(HOME);
  const walk = new TaskWalk(driver.session, '7 Record a take and talk about it');
  walk.note(
    'Recorded the way slice 5 offers it, from practice mode on the practice day. Chromium here has no microphone, so Close stands for Stop, and a take of the current song, created through the API before the walk, stands for the one Stop leaves in the list.',
  );
  await walk.tap(
    'Start the practice',
    { exact: 'Start the practice', css: 'a, button', scope: 'page' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  await walk.tap(
    'Record a take',
    { exact: 'Record a take', css: 'button', scope: 'page' },
    { primary: true },
  );
  await walk.tap('Close the recording sheet', { exact: 'Close', css: 'button', scope: 'dialog' });
  await walk.tap('Open the take', {
    css: 'main section[aria-labelledby=practice-takes-title] button',
    scope: 'page',
  });
  await walk.tap('Comment field', { css: 'textarea', scope: 'page' });
  await walk.type('Comment', 'Le pont est trop lent');
  const moment = await walk.find({ css: 'input[type=checkbox]', scope: 'page' });
  walk.note(
    `The "At <time>" checkbox that pins the comment to a moment is ${moment === null ? 'absent' : 'present but disabled until the audio plays'}; the stand-in take has no audio, so pinning cannot be done here.`,
  );
  await walk.tap(
    'Send',
    { exact: 'Send', css: 'button', scope: 'page' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  const isCommentShown = await isTextInMain(driver, 'Le pont est trop lent');
  const known = await driver.readKnownRecords();
  const pastPractice = known.sessions
    .filter((session) => session.kind === 'practice')
    .sort((first, second) =>
      String(first.startsAt ?? first.date).localeCompare(String(second.startsAt ?? second.date)),
    )[0];
  let sessionListsTakes: boolean | null = null;
  if (pastPractice !== undefined) {
    await driver.open(`/sessions/${pastPractice.id}?view=takes`);
    await waitForMain(driver.session);
    sessionListsTakes = (await driver.session.evaluate(LISTS_A_DURATION)) === true;
  }
  walk.note(
    `The past practice page ${sessionListsTakes === true ? 'lists its takes' : 'lists none of the takes recorded during it'}.`,
  );
  return walk.summarise({
    success: { commentShownUnderTake: isCommentShown, pastSessionListsTakes: sessionListsTakes },
  });
};

const NEW_SONG_TITLE = 'Psycho Chicken';
const MUSIC_SERVICE_SETTLE_MS = 2500;
const NEW_IDEA_ROW = 'New song as an idea';
const SINGLE_SONG = 1;
const CONCERT_PICK_COUNT = 2;

async function typeNewTitle(walk: TaskWalk): Promise<void> {
  walk.note('The search field has the focus when the sheet opens, so typing needs no tap.');
  await walk.type('Title', NEW_SONG_TITLE);
  await waitMilliseconds(MUSIC_SERVICE_SETTLE_MS);
}

async function readRehearsalOutcome(
  driver: BandSessionDriver,
): Promise<{ inRehearsalSetlist: boolean; artist: string | null }> {
  const known = await driver.readKnownRecords();
  const song = known.songs.find((candidate) => candidate.title === NEW_SONG_TITLE);
  return {
    inRehearsalSetlist: (await driver.listEntries(known.rehearsal.id)).some(
      (entry) => entry.title === NEW_SONG_TITLE,
    ),
    artist: song === undefined ? null : (songArtistSchema.parse(song).artist ?? null),
  };
}

const addSongToCatalogue: TaskWalkRunner = async (driver) => {
  await driver.startFresh(HOME);
  const walk = new TaskWalk(driver.session, '8 Add a new song and put it on the next practice');
  await openNextSetlistFromHome(walk);
  await openAddSongs(walk);
  await typeNewTitle(walk);
  const serviceResult = { text: `^${NEW_SONG_TITLE} `, css: 'dialog section li button' };
  const isServiceAnswering = (await walk.find(serviceResult)) !== null;
  if (isServiceAnswering) {
    await walk.tap("Pick the music service's result", serviceResult, { wait: CREATE_SETTLE_MS });
  } else {
    walk.note('The music service did not answer, so the title goes in as an idea.');
    await walk.tap(
      NEW_IDEA_ROW,
      { text: `^${NEW_IDEA_ROW}`, css: 'button', scope: 'dialog' },
      { wait: CREATE_SETTLE_MS },
    );
  }
  await confirmAddSongs(walk, SINGLE_SONG);
  return walk.summarise({
    success: { ...(await readRehearsalOutcome(driver)), fromMusicService: isServiceAnswering },
  });
};

const addSongFromPicker: TaskWalkRunner = async (driver) => {
  await driver.startFresh(HOME);
  const walk = new TaskWalk(driver.session, '8b New song from the setlist (title only)');
  await openNextSetlistFromHome(walk);
  await openAddSongs(walk);
  await typeNewTitle(walk);
  await walk.tap(
    NEW_IDEA_ROW,
    { text: `^${NEW_IDEA_ROW}`, css: 'button', scope: 'dialog' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  await confirmAddSongs(walk, SINGLE_SONG);
  return walk.summarise({ success: await readRehearsalOutcome(driver) });
};

const CHORDS_ABOVE_LYRICS =
  "Am               Em   G\nAin't no sunshine when she's gone\nAm               Em   G\nIt's not warm when she's away";
const WRITE_CLIPBOARD = `async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }`;
const READ_CHORD_TEXT = `() => document.querySelector('#song-chord-text')?.value ?? ''`;

async function didPutOnClipboard(driver: BandSessionDriver, text: string): Promise<boolean> {
  await driver.session
    .send('Browser.grantPermissions', {
      origin: new URL(driver.baseUrl).origin,
      permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
    })
    .catch(() => null);
  return (await driver.session.evaluate(WRITE_CLIPBOARD, text)) === true;
}

const CHORDS_SONG_TITLE = "Ain't No Sunshine";

const addChords: TaskWalkRunner = async (driver) => {
  const known = await driver.startFresh(HOME);
  const song = known.songs.find((candidate) => candidate.title === CHORDS_SONG_TITLE);
  if (song === undefined) throw new Error(`[9] no song titled ${CHORDS_SONG_TITLE} in the seed`);
  await driver.open(`/catalog/${song.id}`);
  const walk = new TaskWalk(driver.session, '9 Add chords to a song');
  walk.note(
    'Starts on the song page, where the spec happy path for task 9 starts (Song, Edit, Paste text, paste, check the preview, save) and which its target of 3 taps plus the paste counts from. Reaching a song from Home is measured by task 10.',
  );
  const tapsBeforeSongPage = walk.taps;
  await walk.tap(
    'Edit',
    { exact: 'Edit', css: 'a', scope: 'page' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  const isOnClipboard = await didPutOnClipboard(driver, CHORDS_ABOVE_LYRICS);
  await walk.tap(
    'Paste text',
    { exact: 'Paste text', css: 'button', scope: 'page' },
    { primary: true, wait: PICK_SETTLE_MS },
  );
  const pasted = String(await driver.session.evaluate(READ_CHORD_TEXT));
  if (!pasted.includes('sunshine')) {
    walk.note('The browser refused the clipboard read, so the chords were typed into the box.');
    await walk.tap('Chord text box', { css: '#song-chord-text', scope: 'page' });
    await walk.type('Paste chart', CHORDS_ABOVE_LYRICS);
  }
  await walk.tap(
    'Save',
    { exact: 'Save', css: 'button', scope: 'page' },
    { primary: true, wait: SAVE_SETTLE_MS },
  );
  walk.note(
    `From the song page: ${String(walk.taps - tapsBeforeSongPage)} taps (Edit, Paste text, Save), with no ChordPro syntax typed.`,
  );
  const location = await walk.readLocation();
  const isShown = await isTextInMain(driver, 'sunshine');
  const saved = z
    .object({ song: z.object({ chart: z.object({ text: z.string() }).passthrough().nullable() }) })
    .passthrough()
    .safeParse(await driver.fetchJson(`/api/songs/${location.path.split('/').at(-1) ?? ''}`));
  return walk.summarise({
    success: {
      landedOn: location.path,
      chartShownOnSongPage: isShown,
      clipboardUsed: isOnClipboard && pasted.includes('sunshine'),
      savedAsChordPro: saved.success && (saved.data.song.chart?.text.includes('[Am]') ?? false),
    },
  });
};

const learnNewSong: TaskWalkRunner = async (driver) => {
  await driver.startFresh(HOME);
  const walk = new TaskWalk(driver.session, '10 Learn a new song');
  await walk.tap('Songs tab', { text: '^Songs', css: TAB_LINK });
  await walk.tap('To learn', { exact: 'To learn', css: 'main [aria-pressed]', scope: 'page' });
  const firstRow = await walk.waitFor({ css: 'main li a', index: 0, scope: 'page' });
  walk.note(`First song to learn: ${firstRow.name}.`);
  await walk.tap(
    'Open the first song to learn',
    { css: 'main li a', index: 0, scope: 'page' },
    { wait: CREATE_SETTLE_MS },
  );
  const listenLinks = Number(await driver.session.evaluate(COUNT_LISTEN_LINKS));
  walk.note(`${String(listenLinks)} listen link(s) on the song page.`);
  await walk.tap('Practised', { exact: 'Practised', css: 'main button' }, { primary: true });
  await waitMilliseconds(SAVE_SETTLE_MS);
  const overview = studiesOverviewSchema.parse(await driver.fetchJson('/api/studies/overview'));
  return walk.summarise({
    success: {
      todayCounted: overview.myStreak?.isTodayCounted ?? null,
      studiedToday: (overview.queue ?? [])
        .filter((item) => item.isStudiedToday === true)
        .map((item) => item.title),
    },
  });
};

const studiesOverviewSchema = z
  .object({
    queue: z
      .array(z.object({ title: z.string(), isStudiedToday: z.boolean().optional() }))
      .optional(),
    myStreak: z.object({ isTodayCounted: z.boolean().optional() }).nullable().optional(),
  })
  .passthrough();

const discussWhichSongs: TaskWalkRunner = async (driver) => {
  const known = await driver.startFresh((records) => `/setlists/${records.rehearsal.id}`);
  const walk = new TaskWalk(driver.session, '11 Discuss which songs to play');
  await walk.tap('More actions', { exact: 'More actions', css: 'summary' });
  await walk.tap(
    'Open a vote (setlist menu)',
    { exact: 'Open a vote', css: 'button' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  for (const title of ['Kiss', 'Billie Jean', 'Respect', 'Valerie', 'Superstition']) {
    await walk.tap(
      `Score ${title}`,
      { exact: `Score ${title}`, css: 'button' },
      { wait: PICK_SETTLE_MS },
    );
  }
  await walk.tap(
    'Close the vote',
    { exact: 'Close the vote', css: 'button' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  const after = await walk.readLocation();
  const panel = z
    .array(z.string())
    .parse(await driver.session.evaluate(LIST_VISIBLE_BUTTON_NAMES, LISTED_BUTTON_COUNT));
  walk.note(
    `After "Close the vote": ${after.path}${after.overlay === null ? '' : ` + ${after.overlay}`}; buttons: ${panel.join(' | ')}`,
  );
  await walk.tap(
    'Make this the setlist',
    { exact: 'Make this the setlist', css: 'button' },
    { primary: true, wait: SAVE_SETTLE_MS },
  );
  const list = await driver.listEntries(known.rehearsal.id);
  const setlist = (await driver.readKnownRecords()).setlists.find(
    (candidate) => candidate.id === known.rehearsal.id,
  );
  return walk.summarise({
    success: {
      finalScreen: await walk.readLocation(),
      setlistStatus: setlist?.status ?? null,
      firstTitles: list.slice(0, SHOWN_TITLE_COUNT).map((entry) => entry.title),
      songCount: list.length,
    },
  });
};

const checkWhatIsNext: TaskWalkRunner = async (driver) => {
  const known = await driver.startFresh(HOME);
  const walk = new TaskWalk(driver.session, '12 Check what is next');
  const next = selectNextSession(
    known.sessions.map((session) => ({
      ...session,
      date: String(session.date ?? session.startsAt),
    })),
    new Date(),
  );
  await walk.markScreen();
  const card = await walk.waitFor({ css: 'section[aria-label="Next session"]', scope: 'page' });
  await waitMilliseconds(CREATE_SETTLE_MS);
  const shown = String(await driver.session.evaluate(READ_NEXT_SESSION_TEXT));
  const setlist = known.setlists.find((candidate) =>
    (candidate.sessionIds ?? []).includes(next?.id ?? ''),
  );
  const venue = next?.venue ?? null;
  const facts = {
    kind: next !== null && shown.toLowerCase().includes(next.kind),
    date: next !== null && shown.includes(formatSessionDate(next.date, HOME_LOCALE)),
    venue: venue === null || shown.includes(venue),
    setlist: setlist !== undefined && shown.includes(setlist.name),
    songCount: /\d+ songs?/u.test(shown),
  };
  walk.note(`Next session card on arrival: ${shown}`);
  return walk.summarise({
    success: { nextSessionId: next?.id ?? null, facts, onArrival: card.inView },
  });
};

const PRACTICE_KIND = 'practice';

async function movePracticeToToday(driver: BandSessionDriver): Promise<string | null> {
  const known = await driver.readKnownRecords();
  const nowMs = Date.now();
  const coming = known.sessions.find(
    (session) =>
      session.kind === PRACTICE_KIND && Date.parse(session.date ?? session.startsAt ?? '') > nowMs,
  );
  if (coming === undefined) return null;
  await driver.putJson(`/api/sessions/${coming.id}`, {
    kind: PRACTICE_KIND,
    date: new Date(nowMs).toISOString(),
  });
  return coming.id;
}

async function readPageHeading(driver: BandSessionDriver): Promise<string | null> {
  await waitForMain(driver.session);
  const heading = await driver.session.evaluate(READ_PAGE_HEADING);
  return typeof heading === 'string' ? heading : null;
}

const recordDuringPractice: TaskWalkRunner = async (driver) => {
  await driver.startFresh(HOME);
  const practiceId = await movePracticeToToday(driver);
  await driver.open(HOME);
  const walk = new TaskWalk(
    driver.session,
    '13 Record a take of the current song during a practice',
  );
  await walk.tap(
    'Start the practice',
    { exact: 'Start the practice', css: 'a, button', scope: 'page' },
    { primary: true, wait: CREATE_SETTLE_MS },
  );
  const firstSong = await readPageHeading(driver);
  await walk.tap(
    'Record a take',
    { exact: 'Record a take', css: 'button', scope: 'page' },
    { primary: true },
  );
  walk.note(
    'Chromium here has no microphone, so the recording sheet says so and offers the upload form; on a phone this tap starts recording and Stop is one more tap.',
  );
  const recordingLocation = await walk.readLocation();
  const setup = new TaskWalk(driver.session, 'close the recording sheet');
  await setup.tap('Close', { exact: 'Close', css: 'button', scope: 'dialog' });
  await waitMilliseconds(CLOSE_SETTLE_MS);
  const partB = new TaskWalk(driver.session, '13b Move to the next song and record it');
  await partB.tap(
    'Next song',
    { exact: 'Next song', css: 'button', scope: 'page' },
    { wait: PICK_SETTLE_MS },
  );
  const secondSong = await readPageHeading(driver);
  await partB.tap(
    'Record a take',
    { exact: 'Record a take', css: 'button', scope: 'page' },
    { primary: true },
  );
  const summary = anyRecord.parse(
    walk.summarise({
      success: {
        practiceMovedToToday: practiceId !== null,
        practicePath:
          practiceId === null ? null : replaceIdentifierInPath(`/sessions/${practiceId}/practice`),
        firstSong,
        recordingSheetOpen: recordingLocation.overlay !== null,
      },
    }),
  );
  return {
    ...summary,
    partB: anyRecord.parse(
      partB.summarise({
        success: {
          secondSong,
          currentSongChanged: secondSong !== null && secondSong !== firstSong,
        },
      }),
    ),
  };
};

export const TASK_WALKS: Readonly<Record<string, TaskWalkRunner>> = {
  '1': prepareNextRehearsal,
  '2': buildConcertSetlist,
  '3': agreeWhoDoesWhat,
  '4': setLineupForOneSong,
  '5': noteTransition,
  '6': noteSongForTonight,
  '7': recordTakeAndTalk,
  '8': addSongToCatalogue,
  '8b': addSongFromPicker,
  '9': addChords,
  '10': learnNewSong,
  '11': discussWhichSongs,
  '12': checkWhatIsNext,
  '13': recordDuringPractice,
};
