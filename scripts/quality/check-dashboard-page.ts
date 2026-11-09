#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type ConsoleMessage, type Page } from 'playwright';
import {
  buildHarnessHtml,
  listNonUniformScalings,
  listPageFaults,
  splitPageHtml,
  type WidthMeasurement,
} from './dashboard-page.core';

const DASHBOARD_DIRECTORY = join('scripts', 'quality', 'dashboard');
const PAGE_PATH = join(DASHBOARD_DIRECTORY, 'index.html');
const FIXTURE_PATH = join(DASHBOARD_DIRECTORY, 'fixture.json');
const D3_PATH = join('node_modules', 'd3', 'dist', 'd3.min.js');
const VIEWPORT_WIDTHS: readonly number[] = [390, 768, 1280];
const VIEWPORT_HEIGHT = 900;
const SERIES_COLOURS = ['#2a78d6', '#d98c2a', '#2a9d8f', '#9b5de5', '#c1546b'];
const RANGES: readonly string[] = ['week', 'hour', 'minute'];
const DRAW_WAIT_MILLISECONDS = 250;
const OPEN_EVERY_ROW =
  '(() => { for (const row of document.querySelectorAll("details")) row.open = true; })()';
const DOCUMENT_WIDTH = 'document.documentElement.scrollWidth';
const SPARKLINE_BARS = 'document.querySelectorAll(".s3-spark svg rect").length';
const ENLARGED_CHART_BARS = 'document.querySelectorAll(".s3-plot svg rect").length';

function buildDashSource(): string {
  const fixture = readFileSync(FIXTURE_PATH, 'utf8');
  return `window.dash = (() => {
    const sets = ${fixture};
    const colours = ${JSON.stringify(SERIES_COLOURS)};
    let params = { range: 'week' };
    const listeners = [];
    const notify = () => { for (const listener of listeners) listener(); };
    return {
      colors: colours,
      data: (id) => Object.prototype.hasOwnProperty.call(sets, id)
        ? { status: 'ok', data: sets[id], columns: Object.keys(sets[id][0] ?? {}), message: '', refreshing: false, meta: {} }
        : { status: 'missing', data: [], columns: [], message: 'no such dataset', refreshing: false, meta: {} },
      onData: (listener) => { listeners.push(listener); listener(); },
      params: () => params,
      setParams: (next) => { params = { ...params, ...next }; notify(); },
      resetParams: () => { params = { range: 'week' }; notify(); },
      calc: () => undefined,
      loader: () => undefined,
      refresh: () => undefined,
      setLink: () => undefined,
      draw: {},
    };
  })();`;
}

async function openEveryRow(page: Page): Promise<void> {
  await page.evaluate(OPEN_EVERY_ROW);
  await page.waitForTimeout(DRAW_WAIT_MILLISECONDS);
}

async function measureWidths(page: Page): Promise<readonly WidthMeasurement[]> {
  const measurements: WidthMeasurement[] = [];
  for (const viewportWidth of VIEWPORT_WIDTHS) {
    await page.setViewportSize({ width: viewportWidth, height: VIEWPORT_HEIGHT });
    await openEveryRow(page);
    const documentWidth = await page.evaluate<number>(DOCUMENT_WIDTH);
    measurements.push({ viewportWidth, documentWidth });
  }
  return measurements;
}

async function countSparklineBars(page: Page): Promise<number> {
  return page.evaluate<number>(SPARKLINE_BARS);
}

async function openEnlargedChart(page: Page): Promise<number> {
  const chip = page.locator('.s3-chip:not([disabled])').first();
  await chip.click();
  await page.waitForTimeout(DRAW_WAIT_MILLISECONDS);
  return page.evaluate<number>(ENLARGED_CHART_BARS);
}

async function switchEveryRange(page: Page): Promise<void> {
  for (const range of RANGES) {
    await page.selectOption('.s3-range', range);
    await openEveryRow(page);
  }
}

async function inspectPage(browser: Browser, harnessHtml: string): Promise<readonly string[]> {
  const consoleErrors: string[] = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: VIEWPORT_HEIGHT } });
  page.on('pageerror', (error: Error) => consoleErrors.push(error.message));
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.setContent(harnessHtml, { waitUntil: 'load' });
  await page.waitForTimeout(DRAW_WAIT_MILLISECONDS);
  await switchEveryRange(page);
  await page.selectOption('.s3-range', 'week');
  const widths = await measureWidths(page);
  await page.setViewportSize({ width: VIEWPORT_WIDTHS[0] ?? 390, height: VIEWPORT_HEIGHT });
  await openEveryRow(page);
  const sparklineBars = await countSparklineBars(page);
  const enlargedChartBars = await openEnlargedChart(page);
  await page.close();
  return listPageFaults({ consoleErrors, widths, sparklineBars, enlargedChartBars });
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (error) {
    process.stderr.write(
      `[check-dashboard-page] no Chromium to render ${PAGE_PATH} with: ` +
        `${error instanceof Error ? error.message.split('\n')[0] : String(error)}\n` +
        'Install one with `pnpm exec playwright install chromium`, then run this again. ' +
        'Skipping the render would leave the page checked by nothing.\n',
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const pageHtml = readFileSync(PAGE_PATH, 'utf8');
  const staticFaults = [...splitPageHtml(pageHtml).faults, ...listNonUniformScalings(pageHtml)];
  const harnessHtml = buildHarnessHtml({
    pageHtml,
    d3Source: readFileSync(D3_PATH, 'utf8'),
    dashSource: buildDashSource(),
  });
  const browser = await launchBrowser();
  const renderedFaults = await inspectPage(browser, harnessHtml);
  await browser.close();
  const faults = [...staticFaults, ...renderedFaults];
  if (faults.length === 0) {
    process.stdout.write(
      `[check-dashboard-page] ${PAGE_PATH} renders clean at ` +
        `${VIEWPORT_WIDTHS.join(', ')} px, in every range, with every row open\n`,
    );
    return;
  }
  for (const fault of faults) process.stderr.write(`  ${fault}\n`);
  process.stderr.write(
    `\n${PAGE_PATH} is published to a dashboard artifact that nothing in this repository ` +
      "renders, so the operator's screen used to be its first. Each script above runs in its own " +
      'scope there, as it does here: anything two scripts share goes on window.s3. ' +
      'See docs/dantotsus/the-page-nobody-rendered-before-the-operator.md.\n',
  );
  process.exitCode = 1;
}

await main();
