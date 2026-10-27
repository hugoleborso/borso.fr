// Measured baseline for the pragma UX build: top tasks walked with real argent taps,
// plus per-route counts, all at 390x844 in emulated standalone display mode.
// Usage: node run-baseline.mjs [--tasks 1,2,...|all|none] [--routes] [--out baseline.json]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Cdp, emulatePhone, goto, settle, sleep, Walk, PHONE } from './driver.mjs';

const BASE = process.env.BASE ?? 'http://localhost:5182';
const SITE_PORT = new URL(BASE).port;
const COORD = new URL('../coordinator', import.meta.url).pathname;
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const OUT = opt('--out', new URL('./baseline.json', import.meta.url).pathname);
const taskArg = opt('--tasks', 'all');
const TASKS =
  taskArg === 'all'
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : taskArg === 'none'
      ? []
      : taskArg.split(',').map(Number);
const DO_ROUTES = args.includes('--routes');

const cdp = await Cdp.connect();
await emulatePhone(cdp);

// ---------- page probes (read only) ----------
const COUNT_SCROLL = `() => {
  const found = [];
  for (const e of document.querySelectorAll('*')) {
    if (e === document.scrollingElement || e === document.body) continue;
    const s = getComputedStyle(e);
    const y = /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1;
    const x = /(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1;
    if (!y && !x) continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    found.push({ axis: y && x ? 'xy' : y ? 'y' : 'x', tag: e.tagName.toLowerCase(), box: [r.x, r.y, r.width, r.height].map(Math.round), scrollHeight: e.scrollHeight, clientHeight: e.clientHeight, className: String(e.className).slice(0, 70) });
  }
  const root = document.scrollingElement;
  const htmlHidden = getComputedStyle(document.documentElement).overflowY === 'hidden' || getComputedStyle(document.body).overflowY === 'hidden';
  const documentScrolls = root.scrollHeight > visualViewport.height + 1 && !htmlHidden;
  const documentScrollsX = root.scrollWidth > visualViewport.width + 1;
  return { vertical: found.filter((f) => f.axis !== 'x').length + (documentScrolls ? 1 : 0), horizontal: found.filter((f) => f.axis !== 'y').length + (documentScrollsX ? 1 : 0),
    documentScrolls, documentScrollsX, pageHeightInScreens: Number((root.scrollHeight / visualViewport.height).toFixed(2)), layoutWidth: innerWidth, containers: found };
}`;

const COUNT_BUTTONS = `() => {
  const shown = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('dialog:not([open])'); };
  const visibleText = (e) => { let out = ''; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const range = document.createRange(); range.selectNodeContents(n); const r = range.getBoundingClientRect(); const ps = getComputedStyle(n.parentElement); if (r.width > 1 && r.height > 1 && ps.visibility !== 'hidden' && ps.opacity !== '0') out += ' ' + t; } return out.trim(); };
  const hasIcon = (e) => [...e.querySelectorAll('svg, img, [role=img]')].some((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const isGlyph = (t) => t.length > 0 && t.length <= 2 && !/[\\p{L}\\p{N}]/u.test(t);
  const rows = { button: { iconOnly: [], textOnly: [], iconAndText: [], neither: [], total: 0 }, link: { iconOnly: [], textOnly: [], iconAndText: [], neither: [], total: 0 } };
  for (const e of document.querySelectorAll('button, [role=button], summary, input[type=button], input[type=submit], a[href]')) {
    if (!shown(e)) continue;
    if (e.matches('a[href]') && !e.matches('[role=button]') && e.closest('button')) continue;
    const kind = e.matches('a[href]') && !e.matches('[role=button]') ? 'link' : 'button';
    const text = e.tagName === 'INPUT' ? e.value : visibleText(e);
    const icon = hasIcon(e) || isGlyph(text);
    const realText = isGlyph(text) ? '' : text;
    const name = (e.getAttribute('aria-label') || text || e.title || '').replace(/\\s+/g, ' ').slice(0, 60);
    const r = e.getBoundingClientRect();
    const entry = { name, y: Math.round(r.y + scrollY) };
    rows[kind].total++;
    if (icon && !realText) rows[kind].iconOnly.push(entry); else if (realText && !icon) rows[kind].textOnly.push(entry); else if (icon && realText) rows[kind].iconAndText.push(entry); else rows[kind].neither.push(entry);
  }
  return rows;
}`;

async function scrollCount() {
  return cdp.eval(COUNT_SCROLL);
}

// ---------- session helpers ----------
async function signIn(user = 'hugo') {
  await goto(cdp, `${BASE}/login`);
  const w = new Walk(cdp, 'sign-in');
  if ((await w.where()).path !== '/login') return;
  await w.tap('name', { css: '#login-username' });
  await w.type('name', user);
  await w.tap('password', { css: '#login-password' });
  await w.type('password', 'pragma-preview');
  await w.tap('enter', { css: 'button[type=submit]', scope: 'page' }, { wait: 1500 });
  const after = await w.where();
  if (after.path === '/login') throw new Error('sign in failed');
}
async function signOut() {
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCookies');
  await goto(cdp, `${BASE}/login`);
  await cdp.eval(`() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }`);
}
function reseed() {
  execFileSync(`${COORD}/pragma-instance.sh`, ['reseed', SITE_PORT], { stdio: 'ignore' });
}
async function api(path) {
  return cdp.eval(
    `async (p) => { const r = await fetch(p, { credentials: 'include' }); return r.ok ? r.json() : { status: r.status }; }`,
    path,
  );
}
async function ids() {
  const setlists = (await api('/api/setlists')).setlists ?? [];
  const songs = (await api('/api/songs')).songs ?? [];
  const sessions = (await api('/api/sessions')).sessions ?? [];
  const byName = (re) => setlists.find((s) => new RegExp(re).test(s.name));
  return {
    setlists,
    songs,
    sessions,
    main: byName('^Set principal'),
    rehearsal: byName('^Répétition du jeudi'),
    concert: sessions.find((s) => s.kind === 'concert') ?? sessions[0],
  };
}
async function entries(setlistId) {
  const songs = Object.fromEntries(((await api('/api/songs')).songs ?? []).map((x) => [x.id, x]));
  return ((await api(`/api/setlists/${setlistId}/entries`)).entries ?? [])
    .sort((a, b) => a.position - b.position)
    .map((e) => ({
      title: songs[e.songId]?.title ?? e.songId,
      notes: e.notes,
      keyOverride: e.keyOverride,
      lineupOverride: e.lineupOverride,
      songDefaultLineup: songs[e.songId]?.defaultLineup ?? songs[e.songId]?.lineup ?? null,
    }));
}
async function freshStart(path = '/catalog', user = 'hugo') {
  reseed();
  await signOut();
  await signIn(user);
  const known = await ids();
  await goto(cdp, `${BASE}${typeof path === 'function' ? path(known) : path}`);
  return known;
}

// Each Walk records the scroll-area count of every new screen or overlay it reaches.
const origMark = Walk.prototype.markScreen;
Walk.prototype.markScreen = async function () {
  const before = this.screens.length;
  const w = await origMark.call(this);
  if (this.screens.length !== before) {
    const c = await scrollCount();
    (this.screenScroll ??= {})[this.screens[this.screens.length - 1]] = {
      vertical: c.vertical,
      horizontal: c.horizontal,
      documentScrolls: c.documentScrolls,
      containers: c.containers.map(
        (x) => `${x.axis} ${x.tag} ${x.box.join(',')} (${x.scrollHeight}/${x.clientHeight})`,
      ),
    };
  }
  return w;
};
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const strip = (v) => JSON.parse(JSON.stringify(v).replace(UUID, ':id'));
const summarise = (w, extra) =>
  strip({
    ...w.summary(extra),
    scrollAreasPerScreen: w.screenScroll ?? {},
    maxVerticalScrollAreas: Math.max(
      0,
      ...Object.values(w.screenScroll ?? {}).map((s) => s.vertical),
    ),
  });

// ---------- tasks ----------
const tasks = {};

tasks[1] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '1 Prepare the next rehearsal');
  await w.tap('Sessions tab', { text: '^Sessions', css: 'nav a' });
  await w.tap('New practice', { exact: 'Practice', css: 'button' }, { primary: true });
  await w.tap('Create session', { exact: 'Create', css: 'button' }, { wait: 1200 });
  await w.tap('New setlist', { exact: 'New setlist', css: 'button' }, { primary: true });
  w.note('The name field comes filled with "Set 1", so the shortest path keeps it.');
  await w.tap('Create setlist', { exact: 'Create', css: 'button' }, { wait: 1200 });
  w.note(
    `After creating the setlist the screen stays on ${(await w.where()).path.replace(/[0-9a-f-]{36}/, ':id')}.`,
  );
  await w.tap('Open the new setlist', { text: '^Set 1', css: 'main a' }, { wait: 1200 });
  await w.tap('Add song', { exact: 'Add song', css: 'button', scope: 'page' }, { primary: true });
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
  for (const title of picks)
    await w.tap(
      `Pick ${title}`,
      { text: `^${title.replace(/[!?.]/g, '\\$&')} `, css: 'button', scope: 'dialog' },
      { wait: 500 },
    );
  await w.tap('Done', { text: '^Done', css: 'button', scope: 'dialog' }, { primary: true });
  const sessions = (await api('/api/sessions')).sessions;
  const setlists = (await api('/api/setlists')).setlists;
  const made = setlists.find((s) => s.name === 'Set 1');
  const list = made ? await entries(made.id) : [];
  return summarise(w, {
    success: {
      practices: sessions.filter((s) => s.kind === 'practice').length,
      newSetlistAttachedTo: made?.sessionIds?.length ?? 0,
      newSetlistSongs: list.map((e) => e.title),
    },
  });
};

tasks[2] = async () => {
  const known = await freshStart('/catalog');
  const before = await entries(known.main.id);
  const w = new Walk(cdp, '2 Build the concert setlist');
  await w.tap('Setlists tab', { text: '^Setlists', css: 'nav a' });
  await w.tap('Open Set principal', { text: '^Set principal', css: 'main a' }, { wait: 1200 });
  await w.tap('Add song', { exact: 'Add song', css: 'button', scope: 'page' }, { primary: true });
  await w.tap('Pick Dreams', { text: '^Dreams ', css: 'button', scope: 'dialog' });
  await w.tap('Pick Psycho Killer', { text: '^Psycho Killer ', css: 'button', scope: 'dialog' });
  await w.tap('Done', { text: '^Done', css: 'button', scope: 'dialog' }, { primary: true });
  await w.drag(
    'Drag entry 05 to position 02',
    { exact: 'Drag to reorder', css: 'button', index: 4, scope: 'page' },
    { exact: 'Drag to reorder', css: 'button', index: 1, scope: 'page' },
  );
  await w.tap('Open entry 03 (to remove)', {
    text: '^\\S+ 03 ',
    css: 'main button',
    scope: 'page',
  });
  await w.tap('Remove', { exact: 'Remove', css: 'button', scope: 'dialog' }, { primary: true });
  const confirm = await w.find({ text: '^Remove$', css: 'dialog[open] button', scope: 'dialog' });
  if (confirm) await w.tap('Confirm remove', { text: '^Remove$', css: 'button', scope: 'dialog' });
  else w.note('No confirmation step after Remove.');
  await goto(cdp, `${BASE}/setlists/${known.main.id}`);
  const after = await entries(known.main.id);
  return summarise(w, {
    success: { before: before.map((e) => e.title), afterReload: after.map((e) => e.title) },
  });
};

tasks[3] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '3 Agree who does what');
  await w.tap('More', { exact: 'More', css: 'nav button' });
  await w.tap('Tasks', { exact: 'Tasks', css: 'a', scope: 'dialog' }, { wait: 1200 });
  await w.tap(
    'Task title field (full form)',
    { css: '#task-title', scope: 'page' },
    { primary: true },
  );
  await w.type('Task title', 'Imprimer les setlists');
  await w.tap('Assignee Léa', { exact: 'Léa', css: 'form button', scope: 'page' });
  await w.choose('Linked song', '#task-song', '~Nuit blanche');
  w.note(
    'The song list of a task offers only the 6 compositions (originals), not the 44 catalogue songs.',
  );
  await w.choose('Due date', '#task-due', '2026-11-01');
  await w.tap(
    'Save task',
    { exact: 'Save', css: 'form button[type=submit]', scope: 'page' },
    { primary: true, wait: 1200 },
  );
  const tasksNow = (await api('/api/tasks')).tasks ?? [];
  if (!tasksNow.some((t) => t.title === 'Imprimer les setlists'))
    w.note(
      'DEBUG form state: ' +
        JSON.stringify(
          await cdp.eval(
            `() => ({ title: document.querySelector('#task-title')?.value, song: document.querySelector('#task-song')?.value, due: document.querySelector('#task-due')?.value, alerts: [...document.querySelectorAll('[role=alert]')].map((a) => a.innerText), submitDisabled: [...document.querySelectorAll('form button[type=submit]')].map((b) => b.innerText + ':' + b.disabled) })`,
          ),
        ),
    );
  const made = tasksNow.find((t) => t.title === 'Imprimer les setlists');
  // Part B: Hugo finds his own tasks from the start screen.
  await goto(cdp, `${BASE}/catalog`);
  const b = new Walk(cdp, '3b See my own tasks');
  b.note(
    'Tried the "My part" link in the header first: it opens the concert setlist filtered on the member, and shows no task.',
  );
  await b.tap('More', { exact: 'More', css: 'nav button' });
  await b.tap('Tasks', { exact: 'Tasks', css: 'a', scope: 'dialog' }, { wait: 1200 });
  const ownSpec = { css: 'ul[aria-label^="Hugo"] li button', index: 0, scope: 'page' };
  const hugoFirst = await b.find(ownSpec);
  const bv = hugoFirst
    ? await b.bringIntoView(ownSpec)
    : { first: { inView: false }, scrollsUsed: null };
  return {
    ...summarise(w, {
      success: {
        taskCreated: !!made,
        assignee: made?.assigneeId ?? null,
        songId: made?.songId ?? null,
        dueDate: made?.dueDate ?? null,
      },
    }),
    partB: {
      ...summarise(b),
      firstOwnTaskVisibleOnArrival: bv.first.inView,
      firstOwnTaskYFraction: hugoFirst
        ? Number(((hugoFirst.cy - hugoFirst.screenTop) / hugoFirst.screenH).toFixed(3))
        : null,
      firstOwnTask: hugoFirst?.name ?? null,
      scrollsToReachIt: bv.scrollsUsed,
    },
  };
};

const entryRe = (n) => `^\\S+ ${String(n).padStart(2, '0')} `;

tasks[4] = async () => {
  const known = await freshStart((k) => `/setlists/${k.main.id}`);
  const before = (await entries(known.main.id))[1];
  const w = new Walk(cdp, '4 Set the lineup for one song in a setlist');
  await w.tap('Open entry 02', { text: entryRe(2), css: 'main button' });
  await w.tap(
    'Lineup (this set)',
    { text: '^Lineup', css: 'button', scope: 'dialog' },
    { primary: true },
  );
  await w.tap('Tom plays Guitare', {
    within: { css: 'li', text: '\\bTom\\b' },
    exact: 'Guitare',
    css: 'button',
    scope: 'dialog',
  });
  await w.tap('Save lineup', { exact: 'Save', css: 'button', scope: 'dialog' }, { primary: true });
  const after = await w.where();
  w.note(
    `After Save the screen is ${after.path.replace(/[0-9a-f-]{36}/, ':id')}${after.overlay ? ' with ' + after.overlay : ' (the entry sheet is closed)'}.`,
  );
  const e2 = (await entries(known.main.id))[1];
  return summarise(w, {
    success: {
      entry: e2.title,
      overrideSaved:
        e2.lineupOverride !== null &&
        JSON.stringify(e2.lineupOverride) !== JSON.stringify(before.lineupOverride),
      songDefaultUnchanged:
        JSON.stringify(e2.songDefaultLineup) === JSON.stringify(before.songDefaultLineup),
    },
  });
};

tasks[5] = async () => {
  await freshStart((k) => `/setlists/${k.main.id}`);
  const w = new Walk(cdp, '5 Note a transition');
  await w.tap(
    'Transition band between 04 and 05',
    { exact: 'View / comment the transition', css: 'button', index: 3 },
    { primary: true },
  );
  await w.tap('Note field', { css: 'textarea', scope: 'dialog' });
  await w.type('Transition note', 'Enchainer sans pause, Marc lance la basse');
  await w.tap('Save', { exact: 'Save', css: 'button', scope: 'dialog' }, { primary: true });
  const shown = await cdp.eval(
    `() => document.querySelector('main').innerText.includes('Enchainer sans pause')`,
  );
  w.note(
    shown
      ? 'The note text is shown on the setlist.'
      : 'The note text is not shown on the setlist after saving (only an icon or nothing).',
  );
  const saved = JSON.stringify(await api('/api/transition-comments')).includes(
    'Enchainer sans pause',
  );
  return summarise(w, { success: { saved, noteTextVisibleOnList: shown } });
};

tasks[6] = async () => {
  await freshStart((k) => `/setlists/${k.main.id}`);
  const w = new Walk(cdp, '6 Take a note on a song for tonight');
  await w.tap('Open entry 02', { text: entryRe(2), css: 'main button' }, { primary: true });
  await w.tap('Notes field', { css: 'textarea', scope: 'dialog' }, { primary: true });
  await w.type('Entry note', 'Finir sur le refrain');
  await w.tap('Key field', { css: 'input', index: 0, scope: 'dialog' });
  await w.type('Key', 'Am');
  await w.tap('Close the sheet', { exact: 'Close', css: 'button', scope: 'dialog' });
  await sleep(800);
  const shown = await cdp.eval(
    `() => document.querySelector('main').innerText.includes('Finir sur le refrain')`,
  );
  w.note(
    shown
      ? 'The note is shown on the entry row.'
      : 'The note is not shown on the entry row; it is only visible by opening the sheet again.',
  );
  const e2 = (await entries((await ids()).main.id))[1];
  return summarise(w, {
    success: { noteVisibleOnRow: shown, saved: { notes: e2.notes, keyOverride: e2.keyOverride } },
  });
};

tasks[7] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '7 Record a take and talk about it');
  await w.tap('Search field', { css: 'main input', scope: 'page' });
  await w.type('Search', 'Superstition');
  await w.tap('Open Superstition', { text: 'Superstition', css: 'main a' }, { wait: 1200 });
  await w.tap(
    'Record a take',
    { text: '^Record a take', css: 'button', scope: 'page' },
    { primary: true },
  );
  w.note(
    'The recording sheet shows only Upload and Close here: Chromium has no microphone, so the record and stop buttons cannot be reached or counted. A real phone adds at least 2 taps (record, stop).',
  );
  await w.tap('Close the recording sheet', { exact: 'Close', css: 'button', scope: 'dialog' });
  await w.tap('Open the first take', { text: 'Practice · ', css: 'main button', scope: 'page' });
  await w.tap('Comment field', { css: 'textarea', scope: 'page' });
  await w.type('Comment', 'Le pont est trop lent');
  const moment = await w.find({ css: 'input[type=checkbox]', scope: 'page' });
  w.note(
    `The "At <time>" checkbox that pins the comment to a moment is ${moment ? 'present but disabled until the audio plays' : 'absent'}; the seeded audio does not exist, so pinning cannot be done here.`,
  );
  await w.tap(
    'Send',
    { exact: 'Send', css: 'button', scope: 'page' },
    { primary: true, wait: 1200 },
  );
  const commentShown = await cdp.eval(
    `() => document.querySelector('main').innerText.includes('Le pont est trop lent')`,
  );
  const sessionPage = await (async () => {
    const k = await ids();
    const past = k.sessions
      .filter((s) => s.kind === 'practice')
      .sort((a, b) => String(a.startsAt ?? a.date).localeCompare(String(b.startsAt ?? b.date)))[0];
    if (!past) return null;
    await goto(cdp, `${BASE}/sessions/${past.id}`);
    return cdp.eval(`() => /\\d:\\d\\d/.test(document.querySelector('main').innerText)`);
  })();
  w.note(
    `The past practice page ${sessionPage ? 'lists its takes' : 'lists none of the takes recorded during it'}.`,
  );
  return summarise(w, {
    success: { commentShownUnderTake: commentShown, pastSessionListsTakes: sessionPage },
  });
};

tasks[8] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '8 Add a new song to the catalogue');
  await w.tap(
    'New song',
    { exact: 'New song', css: 'a, button', scope: 'page' },
    { primary: true, wait: 1200 },
  );
  await w.tap('Title field', { css: '#song-title', scope: 'page' });
  await w.type('Title', 'Psycho Chicken');
  await w.tap('Artist field', { css: '#song-artist', scope: 'page' });
  await w.type('Artist', 'The Fools');
  await w.choose('Status', '#song-status', '~In progress');
  await w.tap(
    'Save',
    { exact: 'Save', css: 'button', scope: 'page' },
    { primary: true, wait: 1500 },
  );
  w.note(
    `After Save: ${(await w.where()).path}. The song page has no "add to setlist" action, so the flow leaves to the Setlists tab.`,
  );
  await w.tap('Setlists tab', { text: '^Setlists', css: 'nav a' });
  await w.tap(
    'Open the rehearsal setlist',
    { text: '^Répétition du jeudi', css: 'main a' },
    { wait: 1200 },
  );
  await w.tap('Add song', { exact: 'Add song', css: 'button', scope: 'page' }, { primary: true });
  await w.tap('Picker search', { css: 'input', scope: 'dialog' });
  await w.type('Search', 'Psycho Ch');
  await w.tap('Pick Psycho Chicken', { text: '^Psycho Chicken', css: 'button', scope: 'dialog' });
  await w.tap('Done', { text: '^Done', css: 'button', scope: 'dialog' }, { primary: true });
  const k = await ids();
  const inSet = (await entries(k.rehearsal.id)).some((e) => e.title === 'Psycho Chicken');
  return summarise(w, {
    success: {
      inCatalogue: k.songs.some((s) => s.title === 'Psycho Chicken'),
      inRehearsalSetlist: inSet,
    },
  });
};

tasks['8b'] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '8b Add a song from the setlist picker (title only)');
  await w.tap('Setlists tab', { text: '^Setlists', css: 'nav a' });
  await w.tap(
    'Open the rehearsal setlist',
    { text: '^Répétition du jeudi', css: 'main a' },
    { wait: 1200 },
  );
  await w.tap('Add song', { exact: 'Add song', css: 'button', scope: 'page' }, { primary: true });
  await w.tap('Picker search', { css: 'input', scope: 'dialog' });
  await w.type('Title', 'Psycho Chicken');
  await w.tap(
    'Create from the picker',
    { text: '^Create', css: 'button', scope: 'dialog' },
    { primary: true, wait: 1200 },
  );
  const done = await w.find({ text: '^Done', css: 'button', scope: 'dialog' });
  if (done) await w.tap('Done', { text: '^Done', css: 'button', scope: 'dialog' });
  w.note(
    'This path sets only the title. Artist and status need the song edit page afterwards (Catalog, search, song, Edit, two fields, Save).',
  );
  const k = await ids();
  return summarise(w, {
    success: {
      inRehearsalSetlist: (await entries(k.rehearsal.id)).some((e) => e.title === 'Psycho Chicken'),
    },
  });
};

const CHORDPRO =
  "{title: Ain't No Sunshine}\n[Am]Ain't no sunshine when she's [Em]gone [G]\n[Am]It's not warm when she's a[Em]way [G]";
tasks[9] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '9 Add chords to a song');
  await w.tap('Search field', { css: 'main input', scope: 'page' });
  await w.type('Search', "Ain't No");
  await w.tap(
    "Open Ain't No Sunshine",
    { text: "Ain't No Sunshine", css: 'main a' },
    { wait: 1200 },
  );
  await w.tap(
    'Edit',
    { exact: 'Edit', css: 'a, button', scope: 'page' },
    { primary: true, wait: 1200 },
  );
  await w.tap(
    'ChordPro text',
    { exact: 'ChordPro text', css: 'label', scope: 'page' },
    { primary: true },
  );
  await w.tap('Chart text box', { css: 'textarea', index: 0, scope: 'page' });
  await w.type('Paste chart', CHORDPRO);
  await w.tap(
    'Save',
    { exact: 'Save', css: 'button', scope: 'page' },
    { primary: true, wait: 1500 },
  );
  const where = await w.where();
  const shown = await cdp.eval(
    `() => document.querySelector('main').innerText.includes('sunshine')`,
  );
  return summarise(w, { success: { landedOn: where.path, chartShownOnSongPage: shown } });
};

tasks[10] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '10 Learn a new song');
  await w.tap('Studies tab', { text: '^Studies', css: 'nav a' });
  const first = (await api('/api/studies/overview')).queue?.[0]?.title;
  const rowIsLink = await cdp.eval(
    `() => { const b = [...document.querySelectorAll('main button')].find((e) => e.innerText.trim() === 'Studied'); return !!b?.closest('li, div')?.querySelector('a[href*="/catalog/"]'); }`,
  );
  w.note(
    `First song to study: ${first}. The study row ${rowIsLink ? 'links' : 'does not link'} to the song, so the person goes to the Catalog tab.`,
  );
  await w.tap('Catalog tab', { text: '^Catalog', css: 'nav a' });
  await w.tap(
    `Open ${first}`,
    { text: `^\\S+ ${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `, css: 'main a' },
    { wait: 1200 },
  );
  const before = w.scrolls;
  await w.bringIntoView({ text: '^Takes$', css: 'h2', scope: 'page' });
  w.note(
    `Reading the whole chart down to the Takes heading took ${w.scrolls - before} scroll gestures.`,
  );
  const listen = await w.find({ text: 'Listen on', css: 'a', scope: 'page' });
  w.note(
    listen
      ? 'A listen link is on the song page.'
      : 'No listen link on the song page (it only shows in the setlist entry sheet).',
  );
  await w.tap('Studies tab', { text: '^Studies', css: 'nav a' });
  const kept = await cdp.eval(`() => Math.round(scrollY)`);
  if (kept > 0)
    w.note(
      `Coming back to the Studies tab, the page opened scrolled ${kept} px down (the scroll of the song page is kept), so the first Studied button was above the screen.`,
    );
  await w.tap('Studied', { exact: 'Studied', css: 'main button' }, { primary: true });
  const overview = await api('/api/studies/overview');
  return summarise(w, {
    success: {
      todayCounted: overview.myStreak?.isTodayCounted ?? null,
      studiedToday: (overview.queue ?? []).filter((q) => q.isStudiedToday).map((q) => q.title),
    },
  });
};

tasks[11] = async () => {
  const known = await freshStart((k) => `/setlists/${k.rehearsal.id}`);
  const w = new Walk(cdp, '11 Discuss which songs to play');
  await w.tap(
    'Open a vote (header icon)',
    { exact: 'Open a vote', css: 'button' },
    { primary: true, wait: 1200 },
  );
  await w.tap(
    'Open a vote (vote page)',
    { exact: 'Open a vote', css: 'main button' },
    { primary: true, wait: 1200 },
  );
  for (const title of ['Kiss', 'Billie Jean', 'Respect', 'Valerie', 'Superstition'])
    await w.tap(`Score ${title}`, { exact: `Score ${title}`, css: 'button' }, { wait: 500 });
  await w.tap(
    'Close the vote',
    { exact: 'Close the vote', css: 'button' },
    { primary: true, wait: 1200 },
  );
  const after = await w.where();
  const panel = await cdp.eval(
    `() => [...document.querySelectorAll('main button, dialog[open] button')].map((b) => (b.getAttribute('aria-label') || b.innerText).trim()).filter(Boolean).slice(0, 12)`,
  );
  w.note(
    `After "Close the vote": ${after.path}${after.overlay ? ' + ' + after.overlay : ''}; buttons: ${panel.join(' | ')}`,
  );
  await w.tap(
    'Make this the setlist',
    { exact: 'Make this the setlist', css: 'button' },
    { primary: true, wait: 1500 },
  );
  const list = await entries(known.rehearsal.id);
  const meta = ((await api('/api/setlists')).setlists ?? []).find(
    (x) => x.id === known.rehearsal.id,
  );
  return summarise(w, {
    success: {
      finalScreen: await w.where(),
      setlistStatus: meta?.status ?? null,
      firstTitles: list.slice(0, 8).map((e) => e.title),
      songCount: list.length,
    },
  });
};

tasks[12] = async () => {
  await freshStart('/catalog');
  const w = new Walk(cdp, '12 Check what is next');
  const header = await cdp.eval(
    `() => { const a = [...document.querySelectorAll('a')].find((e) => /\\/sessions\\//.test(e.getAttribute('href') || '')); const r = a?.getBoundingClientRect(); return a ? { text: a.innerText.replace(/\\s+/g, ' '), y: Math.round(r.y), aboveSafeArea: r.y < ${PHONE.insets.top} } : null; }`,
  );
  w.note(
    `Header on arrival: ${JSON.stringify(header)}. Date and place of the concert are readable without a tap; the next practice is not shown.`,
  );
  await w.tap('My part', { exact: 'My part', css: 'a' }, { primary: true, wait: 1200 });
  const landing = await w.where();
  const songsShown = await cdp.eval(
    `() => [...document.querySelectorAll('main button')].filter((b) => /^\\S+ \\d\\d /.test(b.innerText.replace(/\\s+/g, ' '))).length`,
  );
  const firstScreenSongs = await cdp.eval(
    `() => [...document.querySelectorAll('main button')].filter((b) => /^\\S+ \\d\\d /.test(b.innerText.replace(/\\s+/g, ' ')) && b.getBoundingClientRect().bottom < innerHeight - 90).length`,
  );
  w.note(
    `"My part" opens ${landing.path}: ${songsShown} entries listed, ${firstScreenSongs} fully on the first screen.`,
  );
  return summarise(w, { success: { header, landing: landing.path, songsShown, firstScreenSongs } });
};

// ---------- routes ----------
async function measureRoutes() {
  const out = [];
  const measure = async (route, url) => {
    await goto(cdp, `${BASE}${url}`);
    await sleep(600);
    const landed = await cdp.eval(`() => location.pathname`);
    const s = await scrollCount();
    const b = await cdp.eval(COUNT_BUTTONS);
    out.push({
      route,
      url,
      landedOn: landed,
      verticalScrollAreas: s.vertical,
      horizontalScrollAreas: s.horizontal,
      documentScrolls: s.documentScrolls,
      pageHeightInScreens: s.pageHeightInScreens,
      layoutWidth: s.layoutWidth,
      scrollContainers: s.containers.map(
        (x) => `${x.axis} ${x.tag} [${x.box.join(',')}] ${x.scrollHeight}/${x.clientHeight}`,
      ),
      buttons: {
        total: b.button.total,
        iconOnly: b.button.iconOnly.length,
        textNoIcon: b.button.textOnly.length,
        iconAndText: b.button.iconAndText.length,
        noTextNoIcon: b.button.neither.length,
      },
      links: {
        total: b.link.total,
        iconOnly: b.link.iconOnly.length,
        textNoIcon: b.link.textOnly.length,
        iconAndText: b.link.iconAndText.length,
        noTextNoIcon: b.link.neither.length,
      },
      noTextNoIconButtons: b.button.neither.map((e) => e.name || '(no accessible name)'),
      iconOnlyButtons: b.button.iconOnly.map((e) => e.name),
      iconOnlyLinks: b.link.iconOnly.map((e) => e.name),
    });
    console.log(
      `[route] ${route} -> ${landed} v=${s.vertical} h=${s.horizontal} iconOnly=${b.button.iconOnly.length}+${b.link.iconOnly.length}`,
    );
  };
  reseed();
  await signOut();
  for (const r of ['/login', '/recover', '/vote']) await measure(r, r);
  await signIn();
  const k = await ids();
  const chartSong =
    k.songs.find((s) => s.title === 'Afterglow' && s.chart) ?? k.songs.find((s) => s.chart);
  const pastPractice = k.sessions.filter((s) => s.kind === 'practice')[0];
  const routes = [
    ['/vote/:sessionId', `/vote/${k.concert.id}`],
    ['/catalog', '/catalog'],
    ['/catalog/new', '/catalog/new'],
    ['/catalog/:songId', `/catalog/${chartSong.id}`],
    ['/catalog/:songId/edit', `/catalog/${chartSong.id}/edit`],
    ['/catalog/:songId/scene', `/catalog/${chartSong.id}/scene`],
    ['/sessions', '/sessions'],
    ['/sessions/:sessionId (concert)', `/sessions/${k.concert.id}`],
    ['/sessions/:sessionId (practice)', `/sessions/${pastPractice?.id ?? k.concert.id}`],
    ['/sessions/:sessionId/setlist', `/sessions/${k.concert.id}/setlist`],
    ['/setlists', '/setlists'],
    ['/setlists/:setlistId', `/setlists/${k.main.id}`],
    ['/setlists/:setlistId/vote', `/setlists/${k.rehearsal.id}/vote`],
    ['/setlists/:setlistId/audience', `/setlists/${k.main.id}/audience`],
    ['/setlists/:setlistId/scene', `/setlists/${k.main.id}/scene`],
    ['/bars', '/bars'],
    ['/improvements', '/improvements'],
    ['/studies', '/studies'],
    ['/tasks', '/tasks'],
    ['/compos', '/compos'],
    ['/members', '/members'],
    ['/instruments', '/instruments'],
    ['/account', '/account'],
  ];
  for (const [r, u] of routes) await measure(r, u);
  return { songUsed: chartSong.title, routes: out };
}

// ---------- run ----------
const result = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
result.meta = {
  measuredAt: new Date().toISOString(),
  viewport: `${PHONE.width}x${PHONE.height}`,
  insets: PHONE.insets,
  standalone: await cdp.eval(`() => matchMedia('(display-mode: standalone)').matches`),
  base: BASE,
  input:
    'argent gesture-tap / gesture-scroll / gesture-drag / keyboard. On Chromium argent sends a one-finger tap as CDP mouse press and release (pointerType mouse), not as a touch event.',
  bottomThird:
    'centre of the control at or below 2/3 of the screen height on arrival, before any scroll',
};
result.tasks ??= {};
for (const id of args.includes('--with-8b') ? [...TASKS, '8b'] : TASKS) {
  try {
    console.log(`[task] ${id} ...`);
    result.tasks[id] = await tasks[id]();
    console.log(
      `[task] ${id}: taps=${result.tasks[id].taps} scrolls=${result.tasks[id].scrollGestures} screens=${result.tasks[id].screensVisited}`,
    );
  } catch (e) {
    console.log(`[task] ${id} FAILED: ${e.message}`);
    result.tasks[id] = { failed: e.message };
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2));
}
if (DO_ROUTES) {
  result.routes = await measureRoutes();
  writeFileSync(OUT, JSON.stringify(result, null, 2));
}
cdp.close();
