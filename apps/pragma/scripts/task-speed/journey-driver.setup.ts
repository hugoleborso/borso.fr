import type { Locator, Page } from 'playwright';
import type { JourneyPresenter } from './journey-presenter.setup';
import type { StepObservation } from './task-speed.core';

const SETTLE_AFTER_TAP_MS = 400;
const CENTRE_DIVISOR = 2;
const SMOOTH_SCROLL_SETTLE_MS = 900;
const SMOOTH: ScrollBehavior = 'smooth';
const INSTANT: ScrollBehavior = 'instant';

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
  readonly targetCentreX: number;
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

async function readCentre(target: Locator): Promise<{ x: number; y: number }> {
  const box = await target.boundingBox();
  if (box === null) throw new Error('target has no box');
  return { x: box.x + box.width / CENTRE_DIVISOR, y: box.y + box.height / CENTRE_DIVISOR };
}

async function reach(target: Locator, isSmooth: boolean): Promise<Reach> {
  await target.waitFor({ state: 'visible' });
  const centreBefore = await readCentre(target);
  if (await isReachableWithoutScrolling(target)) {
    return { scrolledPixels: 0, targetCentreX: centreBefore.x, targetCentreY: centreBefore.y };
  }
  await target.evaluate(
    (element, behavior) => element.scrollIntoView({ block: 'center', behavior }),
    isSmooth ? SMOOTH : INSTANT,
  );
  if (isSmooth) await target.page().waitForTimeout(SMOOTH_SCROLL_SETTLE_MS);
  const centreAfter = await readCentre(target);
  return {
    scrolledPixels: Math.max(1, Math.round(Math.abs(centreBefore.y - centreAfter.y))),
    targetCentreX: centreAfter.x,
    targetCentreY: centreAfter.y,
  };
}

export function createJourneyDriver(page: Page, presenter: JourneyPresenter | null): JourneyDriver {
  const recorded: StepObservation[] = [];

  async function act(
    target: Locator,
    label: string,
    kind: StepObservation['kind'],
    typedCharacters: number,
    perform: () => Promise<void>,
  ): Promise<void> {
    const before = await readScreenSignature(page);
    const { scrolledPixels, targetCentreX, targetCentreY } = await reach(
      target,
      presenter !== null,
    );
    await presenter?.showStep(label, targetCentreX, targetCentreY);
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
        await field.pressSequentially(text, { delay: presenter?.typingDelayMs ?? 0 });
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
