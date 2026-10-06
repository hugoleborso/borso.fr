import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { type Browser, chromium } from 'playwright';
import { createJourneyDriver } from './journey-driver.setup';
import { JOURNEYS, type Journey } from './task-speed-journeys.setup';
import {
  formatEffortTable,
  indexEffortById,
  type JourneyEffort,
  type JourneyResult,
  measureJourneyEffort,
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

function isEffortIndex(value: unknown): value is Record<string, JourneyEffort> {
  return typeof value === 'object' && value !== null;
}

async function readBaseline(path: string | undefined): Promise<Record<string, JourneyEffort>> {
  if (path === undefined) return {};
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  return isEffortIndex(parsed) ? parsed : {};
}

async function runJourney(
  browser: Browser,
  baseUrl: string,
  journey: Journey,
  screenshotDirectory: string | undefined,
): Promise<JourneyResult> {
  const context = await browser.newContext({
    viewport: PHONE_VIEWPORT,
    hasTouch: true,
    isMobile: true,
    locale: 'en-US',
    baseURL: baseUrl,
  });
  await context.addInitScript(() => window.localStorage.setItem('pragma.locale', 'en'));
  const page = await context.newPage();
  page.setDefaultTimeout(STEP_TIMEOUT_MS);
  try {
    await page.request.post('/api/__test/seed');
    await page.goto(LOGIN_PATH);
    await page.locator('#login-username').fill(SEED_USERNAME);
    await page.locator('#login-password').fill(SEED_PASSWORD);
    await page.locator('button[type=submit]').click();
    await page.waitForURL((url) => url.pathname !== LOGIN_PATH);
    await journey.prepare?.(page.request);
    await page.goto(LANDING_PATH);
    await page.waitForTimeout(SETTLE_AFTER_LANDING_MS);
    const driver = createJourneyDriver(page);
    await journey.run({ page, driver, memberName: SEED_MEMBER_NAME });
    if (screenshotDirectory !== undefined) {
      await page.screenshot({ path: `${screenshotDirectory}/${journey.id}.png` });
    }
    const effort = measureJourneyEffort({
      viewportHeight: PHONE_VIEWPORT.height,
      steps: driver.steps(),
    });
    process.stderr.write(
      `${journey.id}: ${driver
        .steps()
        .map(
          (step) =>
            `${step.label}${step.scrolledPixels > 0 ? ` (scrolled ${step.scrolledPixels}px)` : ''}`,
        )
        .join(' → ')}\n`,
    );
    return { ...journey, effort, failure: null };
  } catch (error) {
    if (screenshotDirectory !== undefined) {
      await page.screenshot({ path: `${screenshotDirectory}/${journey.id}-failed.png` });
    }
    const failure =
      error instanceof Error ? (error.message.split('\n')[0] ?? error.name) : 'unknown';
    return { ...journey, effort: null, failure };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'base-url': { type: 'string', default: DEFAULT_BASE_URL },
      baseline: { type: 'string' },
      out: { type: 'string' },
      screenshots: { type: 'string' },
      only: { type: 'string' },
      chromium: { type: 'string' },
    },
  });
  const baseline = await readBaseline(values.baseline);
  const selected = JOURNEYS.filter(
    (journey) => values.only === undefined || values.only.split(',').includes(journey.id),
  );
  if (values.screenshots !== undefined) await mkdir(values.screenshots, { recursive: true });
  const browser = await chromium.launch(
    values.chromium === undefined ? {} : { executablePath: values.chromium },
  );
  const results: JourneyResult[] = [];
  try {
    for (const journey of selected) {
      results.push(await runJourney(browser, values['base-url'], journey, values.screenshots));
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
