import { z } from 'zod';
import {
  dragBetween,
  refreshArgentViewport,
  scrollAt,
  tapAt,
  typeText,
} from './argent-input.adapter';
import type { CdpSession } from './cdp-session.adapter';
import {
  CHOOSE_NATIVE_OPTION,
  COUNT_SCROLL_AREAS,
  DESCRIBE_FOCUS,
  FIND_TARGET,
  PAGE_SETTLED_PROBE,
  READ_LOCATION,
  READ_VIEWPORT_SIZE,
  STANDALONE_DISPLAY_MODE_SHIM,
  TAPPED_FIELD_FOCUS_PROBE,
} from './page-probes.setup';
import {
  isInBottomThird,
  planScrollGesture,
  projectScreenFraction,
  projectTapPoint,
  replaceIdentifiers,
} from './task-metrics.core';

export const PHONE = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
} as const;

const MAXIMUM_TOUCH_POINTS = 5;
const NAVIGATION_SETTLE_MS = 1200;
const DEFAULT_SETTLE_MS = 700;
const SETTLE_POLL_MS = 250;
const SETTLE_POLL_ATTEMPTS = 20;
const FIND_TIMEOUT_MS = 6000;
const FIND_POLL_MS = 250;
const SCROLL_SETTLE_MS = 450;
const MAXIMUM_SCROLLS_PER_TARGET = 25;
const FOCUS_SETTLE_MS = 250;
const TYPE_SETTLE_MS = 300;
const PICK_SETTLE_MS = 400;
const DRAG_SETTLE_MS = 900;
const UNFOCUSABLE_INPUT_TYPES = new Set(['checkbox', 'radio', 'date']);
const FIELD_TAGS = new Set(['input', 'textarea']);

export const foundTargetSchema = z.object({
  name: z.string(),
  tag: z.string(),
  type: z.string().nullable(),
  rect: z.array(z.number()),
  centreX: z.number(),
  centreY: z.number(),
  viewportHeight: z.number(),
  viewportWidth: z.number(),
  screenHeight: z.number(),
  screenTop: z.number(),
  screenLeft: z.number(),
  screenWidth: z.number(),
  container: z.object({ rect: z.array(z.number()), scrollTop: z.number() }).nullable(),
  visibleTop: z.number(),
  visibleBottom: z.number(),
  hittable: z.boolean(),
  inView: z.boolean(),
});

const locationSchema = z.object({ path: z.string(), overlay: z.string().nullable() });

export const scrollAreaReportSchema = z.object({
  vertical: z.number(),
  horizontal: z.number(),
  documentScrolls: z.boolean(),
  documentScrollsX: z.boolean(),
  pageHeightInScreens: z.number(),
  layoutWidth: z.number(),
  containers: z.array(
    z.object({
      axis: z.string(),
      tag: z.string(),
      box: z.array(z.number()),
      scrollHeight: z.number(),
      clientHeight: z.number(),
      className: z.string(),
    }),
  ),
});

export type FoundTargetReport = z.infer<typeof foundTargetSchema>;
export type ScrollAreaReport = z.infer<typeof scrollAreaReportSchema>;

export interface TargetSpec {
  readonly css?: string;
  readonly text?: string;
  readonly exact?: string;
  readonly index?: number;
  readonly scope?: string;
  readonly within?: { readonly css: string; readonly text: string };
}

export interface TapOptions {
  readonly primary?: boolean;
  readonly wait?: number;
}

export async function waitMilliseconds(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForSettledPage(
  session: CdpSession,
  milliseconds = DEFAULT_SETTLE_MS,
): Promise<void> {
  await waitMilliseconds(milliseconds);
  for (let attempt = 0; attempt < SETTLE_POLL_ATTEMPTS; attempt += 1) {
    const isSettled = await session.evaluate(PAGE_SETTLED_PROBE).catch(() => false);
    if (isSettled === true) return;
    await waitMilliseconds(SETTLE_POLL_MS);
  }
}

export async function navigateTo(session: CdpSession, url: string): Promise<void> {
  await session.send('Page.navigate', { url });
  await waitForSettledPage(session, NAVIGATION_SETTLE_MS);
}

export async function emulatePhone(session: CdpSession): Promise<void> {
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: PHONE.width,
    height: PHONE.height,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    mobile: true,
  });
  await session.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: MAXIMUM_TOUCH_POINTS,
  });
  await session.send('Emulation.setSafeAreaInsetsOverride', { insets: PHONE.insets });
  await session.send('Page.addScriptToEvaluateOnNewDocument', {
    source: STANDALONE_DISPLAY_MODE_SHIM,
  });
  refreshArgentViewport();
}

export async function readScrollAreas(session: CdpSession): Promise<ScrollAreaReport> {
  return scrollAreaReportSchema.parse(await session.evaluate(COUNT_SCROLL_AREAS));
}

const argentState = { viewport: '' };
async function synchroniseArgentViewport(session: CdpSession): Promise<void> {
  const viewport = String(await session.evaluate(READ_VIEWPORT_SIZE));
  if (viewport !== argentState.viewport) {
    refreshArgentViewport();
    argentState.viewport = viewport;
  }
}

export class TaskWalk {
  readonly steps: Record<string, unknown>[] = [];
  readonly screens: string[] = [];
  readonly notes: string[] = [];
  readonly scrollAreasPerScreen: Record<string, unknown> = {};
  taps = 0;
  scrolls = 0;
  texts = 0;

  constructor(
    readonly session: CdpSession,
    readonly task: string,
  ) {}

  async readLocation(): Promise<z.infer<typeof locationSchema>> {
    return locationSchema.parse(await this.session.evaluate(READ_LOCATION));
  }

  async markScreen(): Promise<z.infer<typeof locationSchema>> {
    const location = await this.readLocation();
    const key =
      location.overlay === null ? location.path : `${location.path} + [${location.overlay}]`;
    if (this.screens[this.screens.length - 1] !== key) {
      this.screens.push(key);
      const areas = await readScrollAreas(this.session);
      this.scrollAreasPerScreen[key] = {
        vertical: areas.vertical,
        horizontal: areas.horizontal,
        documentScrolls: areas.documentScrolls,
        containers: areas.containers.map(
          (area) =>
            `${area.axis} ${area.tag} ${area.box.join(',')} (${String(area.scrollHeight)}/${String(area.clientHeight)})`,
        ),
      };
    }
    return location;
  }

  async find(spec: TargetSpec): Promise<FoundTargetReport | null> {
    return foundTargetSchema.nullable().parse(await this.session.evaluate(FIND_TARGET, spec));
  }

  async waitFor(spec: TargetSpec, timeoutMs = FIND_TIMEOUT_MS): Promise<FoundTargetReport> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = await this.find(spec);
      if (found !== null) return found;
      await waitMilliseconds(FIND_POLL_MS);
    }
    throw new Error(
      `[${this.task}] not found: ${JSON.stringify(spec)} on ${JSON.stringify(await this.readLocation())}`,
    );
  }

  async bringIntoView(
    spec: TargetSpec,
  ): Promise<{ first: FoundTargetReport; now: FoundTargetReport; scrollsUsed: number }> {
    let found = await this.waitFor(spec);
    const first = found;
    let scrollsUsed = 0;
    while (!found.inView && scrollsUsed < MAXIMUM_SCROLLS_PER_TARGET) {
      const gesture = planScrollGesture(found);
      await synchroniseArgentViewport(this.session);
      scrollAt(gesture.point, gesture.deltaY);
      scrollsUsed += 1;
      this.scrolls += 1;
      await waitMilliseconds(SCROLL_SETTLE_MS);
      found = await this.waitFor(spec);
    }
    return { first, now: found, scrollsUsed };
  }

  async tap(label: string, spec: TargetSpec, options: TapOptions = {}): Promise<void> {
    await this.markScreen();
    const { first, now, scrollsUsed } = await this.bringIntoView(spec);
    if (!now.inView) throw new Error(`[${this.task}] could not bring into view: ${label}`);
    await synchroniseArgentViewport(this.session);
    tapAt(projectTapPoint(now));
    this.taps += 1;
    this.steps.push({
      n: this.taps,
      kind: 'tap',
      label,
      target: first.name,
      tag: first.tag,
      primary: options.primary === true,
      screen: this.screens[this.screens.length - 1],
      visibleOnArrival: first.inView,
      scrollsBefore: scrollsUsed,
      yFractionOnArrival: projectScreenFraction(first),
      bottomThirdOnArrival: isInBottomThird(first),
      yFractionWhenTapped: projectScreenFraction(now),
      box: first.rect,
    });
    if (FIELD_TAGS.has(now.tag)) await this.assertFieldFocused(label, now);
    await waitForSettledPage(this.session, options.wait ?? DEFAULT_SETTLE_MS);
    await this.markScreen();
  }

  private async assertFieldFocused(label: string, target: FoundTargetReport): Promise<void> {
    await waitMilliseconds(FOCUS_SETTLE_MS);
    const focus = await this.session.evaluate(DESCRIBE_FOCUS);
    const isFocused = await this.session.evaluate(TAPPED_FIELD_FOCUS_PROBE);
    if (isFocused !== true && !UNFOCUSABLE_INPUT_TYPES.has(target.type ?? '')) {
      throw new Error(
        `[${this.task}] tap on ${label} did not focus the field (focus: ${String(focus)}, box ${JSON.stringify(target.rect)})`,
      );
    }
  }

  async type(label: string, text: string): Promise<void> {
    typeText(text);
    this.texts += 1;
    this.steps.push({ kind: 'type', label, chars: text.length });
    await waitMilliseconds(TYPE_SETTLE_MS);
  }

  async choose(label: string, css: string, value: string): Promise<void> {
    await this.tap(`${label} (open picker)`, { css, scope: 'page' });
    const chosen = await this.session.evaluate(CHOOSE_NATIVE_OPTION, { css, value });
    if (chosen === false) throw new Error(`[${this.task}] could not choose ${value} in ${css}`);
    this.taps += 1;
    this.steps.push({
      n: this.taps,
      kind: 'pick',
      label: `${label} = ${value}`,
      note: 'native picker; option set through the DOM, counted as one tap',
    });
    await waitMilliseconds(PICK_SETTLE_MS);
  }

  async drag(label: string, fromSpec: TargetSpec, toSpec: TargetSpec): Promise<void> {
    const { now: origin } = await this.bringIntoView(fromSpec);
    const destination = await this.waitFor(toSpec);
    await synchroniseArgentViewport(this.session);
    dragBetween(projectTapPoint(origin), projectTapPoint(destination));
    this.taps += 1;
    this.steps.push({ n: this.taps, kind: 'drag', label, from: origin.name, to: destination.name });
    await waitForSettledPage(this.session, DRAG_SETTLE_MS);
  }

  note(text: string): void {
    this.notes.push(text);
  }

  summarise(extra: Record<string, unknown> = {}): unknown {
    const screens = [...new Set(this.screens)];
    const primaries = this.steps.filter((step) => step.primary === true);
    const verticalCounts = Object.values(this.scrollAreasPerScreen).map(
      (report) => scrollAreaReportSchema.pick({ vertical: true }).parse(report).vertical,
    );
    return replaceIdentifiers({
      task: this.task,
      taps: this.taps,
      textEntries: this.texts,
      scrollGestures: this.scrolls,
      screensVisited: screens.length,
      screens,
      primaryActions: primaries.map((step) => ({
        label: step.label,
        screen: step.screen,
        visibleWithoutScrolling: step.visibleOnArrival,
        yFraction: step.yFractionOnArrival,
        inBottomThird: step.bottomThirdOnArrival,
      })),
      steps: this.steps,
      notes: this.notes,
      ...extra,
      scrollAreasPerScreen: this.scrollAreasPerScreen,
      maxVerticalScrollAreas: Math.max(0, ...verticalCounts),
    });
  }
}
