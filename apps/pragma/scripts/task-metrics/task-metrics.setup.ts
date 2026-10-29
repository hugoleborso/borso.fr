import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { BandSessionDriver } from './band-session.setup';
import { CDP_PORT } from './argent-input.adapter';
import { connectCdpSession } from './cdp-session.adapter';
import { STANDALONE_PROBE } from './page-probes.setup';
import { measureRoutes } from './route-measures.setup';
import {
  describeTaskCounts,
  listBaselineDifferences,
  parseTaskMetricsArguments,
  summariseRouteButtons,
} from './task-metrics.core';
import { measureSliceOne } from './slice-one-measures.setup';
import { measureSliceFour } from './slice-four-measures.setup';
import { measureScreenRule } from './screen-rule-measures.setup';
import { measureSliceSix } from './slice-six-measures.setup';
import { measureSliceThree } from './slice-three-measures.setup';
import { measureSliceTwo } from './slice-two-measures.setup';
import { TASK_WALKS } from './task-walks.setup';
import { emulatePhone, PHONE } from './walk-recorder.setup';

const DEFAULT_BASE_URL = 'http://localhost:5182';
const JSON_INDENT = 2;
const FIRST_PROGRAM_ARGUMENT = 2;
const FAILURE_EXIT_CODE = 1;
const ARGENT_INPUT_NOTE =
  'argent gesture-tap / gesture-scroll / gesture-drag / keyboard. On Chromium argent sends a one-finger tap as CDP mouse press and release (pointerType mouse), not as a touch event.';
const BOTTOM_THIRD_NOTE =
  'centre of the control at or below 2/3 of the screen height on arrival, before any scroll';

function readExistingResult(path: string | null): Record<string, unknown> {
  if (path === null || !existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
}

function writeResult(path: string | null, result: Record<string, unknown>): void {
  if (path !== null) writeFileSync(path, `${JSON.stringify(result, null, JSON_INDENT)}\n`);
}

function readTaskRecord(result: Record<string, unknown>): Record<string, unknown> {
  const tasks = result.tasks;
  return typeof tasks === 'object' && tasks !== null ? { ...tasks } : {};
}

async function main(): Promise<void> {
  const options = parseTaskMetricsArguments(process.argv.slice(FIRST_PROGRAM_ARGUMENT));
  process.env.AUDIT_SEED_VARIANT = options.seedVariant;
  const baseUrl = process.env.BASE ?? DEFAULT_BASE_URL;
  const session = await connectCdpSession(CDP_PORT);
  await emulatePhone(session);
  const driver = new BandSessionDriver(session, baseUrl);
  const result = readExistingResult(options.outputPath);
  result.meta = {
    measuredAt: new Date().toISOString(),
    viewport: `${String(PHONE.width)}x${String(PHONE.height)}`,
    insets: PHONE.insets,
    standalone: await session.evaluate(STANDALONE_PROBE),
    base: baseUrl,
    seed: options.seedVariant,
    input: ARGENT_INPUT_NOTE,
    bottomThird: BOTTOM_THIRD_NOTE,
  };
  const tasks = readTaskRecord(result);
  result.tasks = tasks;
  for (const taskId of options.taskIds) {
    const walk = TASK_WALKS[taskId];
    if (walk === undefined) throw new Error(`unknown task ${taskId}`);
    console.log(`[task] ${taskId} ...`);
    try {
      tasks[taskId] = await walk(driver);
      console.log(`[task] ${taskId}: ${describeTaskCounts(tasks[taskId])}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[task] ${taskId} FAILED: ${message}`);
      tasks[taskId] = { failed: message };
    }
    writeResult(options.outputPath, result);
  }
  if (options.measureRoutes) {
    result.routes = await measureRoutes(driver);
    result.routeTotals = summariseRouteButtons(result.routes);
    writeResult(options.outputPath, result);
  }
  if (options.measureSliceOne) {
    result.sliceOne = await measureSliceOne(driver);
    writeResult(options.outputPath, result);
  }
  if (options.measureSliceTwo) {
    result.sliceTwo = await measureSliceTwo(driver);
    writeResult(options.outputPath, result);
  }
  if (options.measureSliceThree) {
    result.sliceThree = await measureSliceThree(driver);
    writeResult(options.outputPath, result);
  }
  if (options.measureSliceFour) {
    result.sliceFour = await measureSliceFour(driver);
    writeResult(options.outputPath, result);
  }
  if (options.measureSliceSix) {
    result.sliceSix = await measureSliceSix(driver);
    writeResult(options.outputPath, result);
  }
  if (options.measureScreenRule) {
    const screenRule = await measureScreenRule(driver);
    result.screenRule = screenRule;
    writeResult(options.outputPath, result);
    const violationCount = Number(screenRule.violations);
    console.log(`[screen-rule] ${String(violationCount)} violation(s)`);
    if (violationCount > 0) process.exitCode = FAILURE_EXIT_CODE;
  }
  session.close();
  if (options.baselinePath === null) return;
  const baseline: unknown = JSON.parse(readFileSync(options.baselinePath, 'utf8'));
  const differences = listBaselineDifferences(result, baseline, options.taskIds);
  for (const difference of differences) console.log(`[compare] ${difference}`);
  console.log(
    differences.length === 0
      ? `[compare] no difference with ${options.baselinePath} for ${options.taskIds.join(', ')}`
      : `[compare] ${String(differences.length)} difference(s)`,
  );
  if (differences.length > 0) process.exitCode = FAILURE_EXIT_CODE;
}

await main();
