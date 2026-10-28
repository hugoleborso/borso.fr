import { z } from 'zod';
import { pressKey, tapAt } from './argent-input.adapter';
import type { BandSessionDriver } from './band-session.setup';
import {
  FIND_BACKDROP_POINT,
  READ_FIRST_CONTENT_TOP,
  READ_LANGUAGE_CHIPS,
  READ_OPEN_FIELD_VALUE,
  READ_PATHNAME,
  READ_PRIMARY_ACTIONS,
  READ_SHELL_TABS,
  READ_THEME_COLOUR,
  SEND_JSON,
} from './page-probes.setup';
import { BOTTOM_THIRD_FROM, countTextsWithDigits, selectLongestTitle } from './task-metrics.core';
import { PHONE, readScrollAreas, TaskWalk, waitMilliseconds } from './walk-recorder.setup';

const ROUTE_SETTLE_MS = 900;
const SHEET_SETTLE_MS = 700;
const SCHEME_SETTLE_MS = 300;
const SHELL_LABEL = 'Main sections';
const SHELL_ROUTES = ['/', '/sessions', '/setlists', '/catalog', '/band', '/studies', '/account'];
const PRIMARY_ROUTES = ['/', '/band', '/tasks', '/sessions', '/setlists'];
const FIRST_CONTENT_ROUTES = ['/', '/band', '/sessions', '/catalog'];
const TASKS_ROUTE = '/tasks';
const TASK_TITLE_FIELD = '#task-title';
const TASK_DRAFT_TEXT = 'Imprimer les setlists';
const NEW_TASK_SPEC = { exact: 'New task', css: 'button', scope: 'page' } as const;
const SMALL_PHONE = { width: 375, height: 667 } as const;
const SIGNED_IN_FIRST_NAME = 'Hugo';
const COLOUR_SCHEMES = ['light', 'dark'] as const;
const MANIFEST_PATH = '/manifest.webmanifest';

const shellTabsSchema = z
  .object({ labels: z.array(z.string()), active: z.array(z.string()) })
  .nullable();
const primaryActionSchema = z.array(z.object({ name: z.string(), centreFraction: z.number() }));
const themeColourSchema = z.object({
  values: z.array(z.object({ media: z.string().nullable(), content: z.string() })),
  shown: z.string().nullable(),
});
const languageChipsSchema = z.object({ outsideMain: z.number(), inMainShown: z.number() });
const manifestSchema = z.object({
  shortcuts: z.array(z.object({ url: z.string() })).default([]),
});
const memberListSchema = z.object({
  members: z.array(z.object({ id: z.string(), firstName: z.string() })),
});
const taskListSchema = z.object({
  tasks: z.array(z.object({ id: z.string(), assigneeId: z.string().nullable() })),
});
const songListSchema = z.object({
  songs: z.array(z.object({ id: z.string(), title: z.string() })),
});
const pointSchema = z.object({ x: z.number(), y: z.number() });

async function openAndSettle(driver: BandSessionDriver, path: string): Promise<string> {
  await driver.open(path);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  return String(await driver.session.evaluate(READ_PATHNAME));
}

async function measureShell(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const activeTabByRoute: Record<string, unknown> = {};
  let tabs: z.infer<typeof shellTabsSchema> = null;
  for (const route of SHELL_ROUTES) {
    const landedOn = await openAndSettle(driver, route);
    const read = shellTabsSchema.parse(await driver.session.evaluate(READ_SHELL_TABS, SHELL_LABEL));
    if (route === '/') tabs = read;
    activeTabByRoute[route] = { landedOn, active: read?.active ?? [] };
  }
  return {
    tabCount: tabs?.labels.length ?? 0,
    tabNumbers: countTextsWithDigits(tabs?.labels ?? []),
    tabLabels: tabs?.labels ?? [],
    activeTabByRoute,
  };
}

async function measurePrimaryActions(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const routes: Record<string, unknown> = {};
  for (const route of PRIMARY_ROUTES) {
    const landedOn = await openAndSettle(driver, route);
    const primaries = primaryActionSchema.parse(
      await driver.session.evaluate(READ_PRIMARY_ACTIONS),
    );
    routes[route] = {
      landedOn,
      primaryCount: primaries.length,
      primaries: primaries.map((primary) => ({
        ...primary,
        isInBottomThird: primary.centreFraction >= BOTTOM_THIRD_FROM,
      })),
    };
  }
  return routes;
}

async function measureFirstContentTop(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  const routes: Record<string, unknown> = {};
  for (const route of FIRST_CONTENT_ROUTES) {
    const landedOn = await openAndSettle(driver, route);
    routes[route] = {
      landedOn,
      firstContentTop: z
        .number()
        .nullable()
        .parse(await driver.session.evaluate(READ_FIRST_CONTENT_TOP)),
    };
  }
  return { topInset: PHONE.insets.top, routes };
}

async function measureThemeColour(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await openAndSettle(driver, '/');
  const schemes: Record<string, unknown> = {};
  try {
    for (const scheme of COLOUR_SCHEMES) {
      await driver.session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: scheme }],
      });
      await waitMilliseconds(SCHEME_SETTLE_MS);
      schemes[scheme] = themeColourSchema.parse(await driver.session.evaluate(READ_THEME_COLOUR));
    }
  } finally {
    await driver.session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: 'light' }],
    });
  }
  return schemes;
}

async function measureManifestShortcuts(driver: BandSessionDriver): Promise<string[]> {
  const parsed = manifestSchema.safeParse(await driver.fetchJson(MANIFEST_PATH));
  return parsed.success ? parsed.data.shortcuts.map((shortcut) => shortcut.url) : [];
}

async function measureLanguageSwitch(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await openAndSettle(driver, '/');
  const onHome = languageChipsSchema.parse(await driver.session.evaluate(READ_LANGUAGE_CHIPS));
  await openAndSettle(driver, '/account');
  const onAccount = languageChipsSchema.parse(await driver.session.evaluate(READ_LANGUAGE_CHIPS));
  return { chipsInShell: onHome.outsideMain, chipsShownOnAccount: onAccount.inMainShown };
}

type DraftClose = 'backdrop' | 'escape';

async function hasClosedOpenSheet(driver: BandSessionDriver, how: DraftClose): Promise<boolean> {
  if (how === 'escape') {
    pressKey('Escape');
    return true;
  }
  const backdrop = pointSchema.nullable().parse(await driver.session.evaluate(FIND_BACKDROP_POINT));
  if (backdrop === null) return false;
  tapAt(backdrop);
  return true;
}

async function measureTaskDraftAfter(
  driver: BandSessionDriver,
  how: DraftClose,
): Promise<Record<string, unknown>> {
  await driver.startFresh(TASKS_ROUTE);
  const walk = new TaskWalk(driver.session, `task draft (${how})`);
  await walk.tap('New task', NEW_TASK_SPEC);
  await walk.tap('Title field', { css: TASK_TITLE_FIELD, scope: 'dialog' });
  await walk.type('Task title', TASK_DRAFT_TEXT);
  const isCloseSent = await hasClosedOpenSheet(driver, how);
  if (!isCloseSent) return { isDraftKept: false, note: 'no backdrop area to tap' };
  await waitMilliseconds(SHEET_SETTLE_MS);
  const isClosed = (await walk.readLocation()).overlay === null;
  await walk.tap('New task again', NEW_TASK_SPEC);
  await waitMilliseconds(SHEET_SETTLE_MS);
  const value = z
    .string()
    .nullable()
    .parse(await driver.session.evaluate(READ_OPEN_FIELD_VALUE, TASK_TITLE_FIELD));
  return { isClosed, valueOnReopening: value, isDraftKept: value === TASK_DRAFT_TEXT };
}

async function linkOwnTaskToLongestTitle(driver: BandSessionDriver): Promise<string | null> {
  const members = memberListSchema.parse(await driver.fetchJson('/api/members')).members;
  const signedIn = members.find((member) => member.firstName === SIGNED_IN_FIRST_NAME);
  const tasks = taskListSchema.parse(await driver.fetchJson('/api/tasks')).tasks;
  const ownTask = tasks.find((task) => task.assigneeId === signedIn?.id);
  const longest = selectLongestTitle(
    songListSchema.parse(await driver.fetchJson('/api/songs')).songs,
  );
  if (ownTask === undefined || longest === null) return null;
  await driver.session.evaluate(SEND_JSON, {
    method: 'PUT',
    path: `/api/tasks/${ownTask.id}`,
    body: { songId: longest.id },
  });
  return longest.title;
}

async function measureTasksLayoutWidth(
  driver: BandSessionDriver,
): Promise<Record<string, unknown>> {
  await driver.startFresh('/');
  const linkedTitle = await linkOwnTaskToLongestTitle(driver);
  const landedOn = await openAndSettle(driver, TASKS_ROUTE);
  const atPhone = (await readScrollAreas(driver.session)).layoutWidth;
  let atSmallPhone: number;
  try {
    await driver.session.send('Emulation.setDeviceMetricsOverride', {
      ...SMALL_PHONE,
      deviceScaleFactor: PHONE.deviceScaleFactor,
      mobile: true,
    });
    await waitMilliseconds(ROUTE_SETTLE_MS);
    atSmallPhone = (await readScrollAreas(driver.session)).layoutWidth;
  } finally {
    await driver.session.send('Emulation.setDeviceMetricsOverride', {
      width: PHONE.width,
      height: PHONE.height,
      deviceScaleFactor: PHONE.deviceScaleFactor,
      mobile: true,
    });
  }
  return {
    linkedTitle,
    landedOn,
    [`${String(PHONE.width)}x${String(PHONE.height)}`]: atPhone,
    [`${String(SMALL_PHONE.width)}x${String(SMALL_PHONE.height)}`]: atSmallPhone,
  };
}

export async function measureSliceTwo(driver: BandSessionDriver): Promise<Record<string, unknown>> {
  await driver.startFresh('/');
  return {
    shell: await measureShell(driver),
    primaryActions: await measurePrimaryActions(driver),
    firstContentTop: await measureFirstContentTop(driver),
    themeColour: await measureThemeColour(driver),
    manifestShortcutUrls: await measureManifestShortcuts(driver),
    languageSwitch: await measureLanguageSwitch(driver),
    tasksLayoutWidth: await measureTasksLayoutWidth(driver),
    taskDraftAfterBackdrop: await measureTaskDraftAfter(driver, 'backdrop'),
    taskDraftAfterEscape: await measureTaskDraftAfter(driver, 'escape'),
  };
}
