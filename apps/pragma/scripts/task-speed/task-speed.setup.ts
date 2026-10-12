import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { type Browser, chromium } from 'playwright';
import { createJourneyDriver } from './journey-driver.setup';
import { createJourneyPresenter } from './journey-presenter.setup';
import { JOURNEYS, type Journey } from './task-speed-journeys.setup';
import {
  formatEffortTable,
  indexEffortById,
  type JourneyEffort,
  type JourneyResult,
  measureJourneyEffort,
  summariseEffort,
} from './task-speed.core';

const PHONE_VIEWPORT = { width: 375, height: 667 };
const DEFAULT_BASE_URL = 'http://localhost:5174';
const SEED_USERNAME = 'hugo';
const SEED_MEMBER_NAME = 'Hugo';
const SEED_PASSWORD = 'pragma-preview';
const LANDING_PATH = '/';
const LOGIN_PATH = '/login';
const SETTLE_AFTER_LANDING_MS = 1000;
const JSON_INDENT = 2;
const STEP_TIMEOUT_MS = 8000;
const DEFAULT_VIDEO_LABEL = 'Run';

interface RunOptions {
  readonly baseUrl: string;
  readonly screenshotDirectory: string | undefined;
  readonly videoDirectory: string | undefined;
  readonly videoLabel: string;
  readonly landingPath: string;
}

function isEffortIndex(value: unknown): value is Record<string, JourneyEffort> {
  return typeof value === 'object' && value !== null;
}

async function readBaseline(path: string | undefined): Promise<Record<string, JourneyEffort>> {
  if (path === undefined) return {};
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  return isEffortIndex(parsed) ? parsed : {};
}

async function signIn(browser: Browser, baseUrl: string) {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  try {
    await page.request.post('/api/__test/seed');
    await page.goto(LOGIN_PATH);
    await page.locator('#login-username').fill(SEED_USERNAME);
    await page.locator('#login-password').fill(SEED_PASSWORD);
    await page.locator('button[type=submit]').click();
    await page.waitForURL((url) => url.pathname !== LOGIN_PATH);
    return await context.storageState();
  } finally {
    await context.close();
  }
}

function describePath(steps: ReturnType<ReturnType<typeof createJourneyDriver>['steps']>): string {
  return steps
    .map(
      (step) =>
        `${step.label}${step.scrolledPixels > 0 ? ` (scrolled ${String(step.scrolledPixels)}px)` : ''}`,
    )
    .join(' → ');
}

async function runJourney(
  browser: Browser,
  journey: Journey,
  options: RunOptions,
): Promise<JourneyResult> {
  const storageState = await signIn(browser, options.baseUrl);
  const context = await browser.newContext({
    viewport: PHONE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
    locale: 'en-US',
    baseURL: options.baseUrl,
    storageState,
    ...(options.videoDirectory === undefined
      ? {}
      : { recordVideo: { dir: options.videoDirectory, size: PHONE_VIEWPORT } }),
  });
  await context.addInitScript(() => window.localStorage.setItem('pragma.locale', 'en'));
  const page = await context.newPage();
  page.setDefaultTimeout(STEP_TIMEOUT_MS);
  const presenter =
    options.videoDirectory === undefined ? null : createJourneyPresenter(page, options.videoLabel);
  let result: JourneyResult;
  try {
    await journey.prepare?.(page.request);
    await page.goto(options.landingPath);
    await page.waitForTimeout(SETTLE_AFTER_LANDING_MS);
    await presenter?.showTitleCard(journey.title, 'From the screen the app opens on');
    const driver = createJourneyDriver(page, presenter);
    await journey.run({ page, driver, memberName: SEED_MEMBER_NAME });
    const effort = measureJourneyEffort({
      viewportHeight: PHONE_VIEWPORT.height,
      steps: driver.steps(),
    });
    if (options.screenshotDirectory !== undefined) {
      await page.screenshot({ path: `${options.screenshotDirectory}/${journey.id}.png` });
    }
    await presenter?.showSummary(summariseEffort(effort));
    process.stderr.write(`${journey.id}: ${describePath(driver.steps())}\n`);
    result = { ...journey, effort, failure: null };
  } catch (error) {
    if (options.screenshotDirectory !== undefined) {
      await page.screenshot({ path: `${options.screenshotDirectory}/${journey.id}-failed.png` });
    }
    const failure =
      error instanceof Error ? (error.message.split('\n')[0] ?? error.name) : 'unknown';
    result = { ...journey, effort: null, failure };
  }
  const video = page.video();
  await context.close();
  if (video !== null && options.videoDirectory !== undefined) {
    await rename(await video.path(), `${options.videoDirectory}/${journey.id}.webm`);
  }
  return result;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'base-url': { type: 'string', default: DEFAULT_BASE_URL },
      landing: { type: 'string', default: LANDING_PATH },
      baseline: { type: 'string' },
      out: { type: 'string' },
      screenshots: { type: 'string' },
      only: { type: 'string' },
      chromium: { type: 'string' },
      videos: { type: 'string' },
      'video-label': { type: 'string', default: DEFAULT_VIDEO_LABEL },
    },
  });
  const baseline = await readBaseline(values.baseline);
  const selected = JOURNEYS.filter(
    (journey) => values.only === undefined || values.only.split(',').includes(journey.id),
  );
  for (const directory of [values.screenshots, values.videos]) {
    if (directory !== undefined) await mkdir(directory, { recursive: true });
  }
  const options: RunOptions = {
    baseUrl: values['base-url'],
    landingPath: values.landing,
    screenshotDirectory: values.screenshots,
    videoDirectory: values.videos,
    videoLabel: values['video-label'],
  };
  const browser = await chromium.launch(
    values.chromium === undefined ? {} : { executablePath: values.chromium },
  );
  const results: JourneyResult[] = [];
  try {
    for (const journey of selected) {
      results.push(await runJourney(browser, journey, options));
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(`${formatEffortTable(results, baseline)}\n`);
  if (values.out !== undefined) {
    await writeFile(values.out, `${JSON.stringify(indexEffortById(results), null, JSON_INDENT)}\n`);
  }
}

await main();
