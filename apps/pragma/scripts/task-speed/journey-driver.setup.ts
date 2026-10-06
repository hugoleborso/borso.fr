import type { Locator, Page } from 'playwright';
import type { StepObservation } from './task-speed.core';

const SETTLE_AFTER_TAP_MS = 400;
const CENTRE_DIVISOR = 2;

export interface JourneyDriver {
  readonly tap: (target: Locator, label: string) => Promise<void>;
  readonly type: (field: Locator, text: string, label: string) => Promise<void>;
  readonly choose: (field: Locator, value: string, label: string) => Promise<void>;
  readonly steps: () => readonly StepObservation[];
}

interface ScreenSignature {
  readonly path: string;
  readonly openDialogs: number;
}

interface Reach {
  readonly scrolledPixels: number;
  readonly targetCentreY: number;
}

async function readScreenSignature(page: Page): Promise<ScreenSignature> {
  const openDialogs = await page.locator('dialog[open], [role="dialog"]').count();
  return { path: new URL(page.url()).pathname, openDialogs };
}

function isSameScreen(before: ScreenSignature, after: ScreenSignature): boolean {
  return before.path === after.path && before.openDialogs === after.openDialogs;
}

async function isReachableWithoutScrolling(target: Locator): Promise<boolean> {
  return target.evaluate((element, centreDivisor) => {
    const box = element.getBoundingClientRect();
    const centreX = box.left + box.width / centreDivisor;
    const centreY = box.top + box.height / centreDivisor;
    const isInsideViewport =
      centreY >= 0 && centreY <= window.innerHeight && centreX >= 0 && centreX <= window.innerWidth;
    if (!isInsideViewport) return false;
    const topmost = document.elementFromPoint(centreX, centreY);
    return topmost !== null && (element === topmost || element.contains(topmost));
  }, CENTRE_DIVISOR);
}

async function readCentreY(target: Locator): Promise<number> {
  const box = await target.boundingBox();
  if (box === null) throw new Error('target has no box');
  return box.y + box.height / CENTRE_DIVISOR;
}

async function reach(target: Locator): Promise<Reach> {
  await target.waitFor({ state: 'visible' });
  const centreBefore = await readCentreY(target);
  if (await isReachableWithoutScrolling(target)) {
    return { scrolledPixels: 0, targetCentreY: centreBefore };
  }
  await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const centreAfter = await readCentreY(target);
  return {
    scrolledPixels: Math.max(1, Math.round(Math.abs(centreBefore - centreAfter))),
    targetCentreY: centreAfter,
  };
}

export function createJourneyDriver(page: Page): JourneyDriver {
  const recorded: StepObservation[] = [];

  async function act(
    target: Locator,
    label: string,
    kind: StepObservation['kind'],
    typedCharacters: number,
    perform: () => Promise<void>,
  ): Promise<void> {
    const before = await readScreenSignature(page);
    const { scrolledPixels, targetCentreY } = await reach(target);
    await perform();
    await page.waitForTimeout(SETTLE_AFTER_TAP_MS);
    const after = await readScreenSignature(page);
    recorded.push({
      kind,
      label,
      typedCharacters,
      scrolledPixels,
      targetCentreY,
      hasChangedScreen: !isSameScreen(before, after),
    });
  }

  return {
    tap: (target, label) => act(target, label, 'tap', 0, () => target.tap()),
    type: (field, text, label) =>
      act(field, label, 'type', text.length, async () => {
        await field.tap();
        await field.fill(text);
      }),
    choose: async (field, value, label) => {
      await act(field, label, 'tap', 0, async () => {
        await field.selectOption(value);
      });
      const opening = recorded.at(-1);
      if (opening !== undefined) {
        recorded.push({ ...opening, label: `${label}: ${value}`, scrolledPixels: 0 });
      }
    },
    steps: () => recorded,
  };
}
