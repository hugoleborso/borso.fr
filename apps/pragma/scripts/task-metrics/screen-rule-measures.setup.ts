import { z } from 'zod';
import type { BandSessionDriver } from './band-session.setup';
import {
  READ_CONTENT_BELOW_LIST,
  READ_PAGE_HEADER,
  READ_PAGE_HEADER_BOX,
  READ_PATHNAME,
  SCROLL_TO_PAGE_END,
} from './page-probes.setup';
import { buildSignedInRoutePlan, type RouteTarget } from './route-measures.setup';
import {
  ANY_BACK_LINK,
  type ExpectedBackLink,
  listScreenRuleViolations,
  summariseScreenRule,
} from './screen-rule.core';
import { emulatePhone, PHONE, waitMilliseconds } from './walk-recorder.setup';

const ROUTE_SETTLE_MS = 900;
const SCROLL_SETTLE_MS = 400;
const SMALL_PHONE = { width: 375, height: 667 } as const;
const SMALL_PHONE_INSETS = { top: 20, bottom: 0, left: 0, right: 0 } as const;
const BAND_PATH = '/band';
const SIGNED_OUT_ROUTES: readonly ScreenRuleRoute[] = [
  { route: '/login', url: '/login', back: null },
  { route: '/recover', url: '/recover', back: '/login' },
];
const STAGE_ROUTES = new Set(['/catalog/:songId/scene', '/setlists/:setlistId/scene']);
const TAB_ROOTS = new Set(['/', '/catalog', '/sessions', '/setlists', '/band']);
const BAND_SUB_PAGES = new Set([
  '/members',
  '/instruments',
  '/bars',
  '/compos',
  '/improvements',
  '/account',
]);
const NO_BACK_LINK_ROUTES = new Set(['/vote/:sessionId']);

const headerSchema = z.object({
  hasHeader: z.boolean(),
  headerPosition: z.string().nullable(),
  backLinks: z.array(z.string()),
});
const headerBoxSchema = z.object({
  headerTopAfterEnd: z.number().nullable(),
  headerBottomAfterEnd: z.number().nullable(),
  viewportHeight: z.number(),
});
const contentBelowListSchema = z.array(z.object({ list: z.string(), below: z.string() }));

interface ScreenRuleRoute extends RouteTarget {
  readonly back: ExpectedBackLink;
}

function expectBackLink(route: string): ExpectedBackLink {
  if (BAND_SUB_PAGES.has(route)) return BAND_PATH;
  if (TAB_ROOTS.has(route) || NO_BACK_LINK_ROUTES.has(route)) return null;
  return ANY_BACK_LINK;
}

async function emulateSmallPhone(driver: BandSessionDriver): Promise<void> {
  await driver.session.send('Emulation.setDeviceMetricsOverride', {
    width: SMALL_PHONE.width,
    height: SMALL_PHONE.height,
    deviceScaleFactor: PHONE.deviceScaleFactor,
    mobile: true,
  });
  await driver.session.send('Emulation.setSafeAreaInsetsOverride', {
    insets: SMALL_PHONE_INSETS,
  });
}

async function measureScreen(
  driver: BandSessionDriver,
  target: ScreenRuleRoute,
): Promise<{ readonly report: Record<string, unknown>; readonly violations: string[] }> {
  await driver.open(target.url);
  await waitMilliseconds(ROUTE_SETTLE_MS);
  const landedOn = String(await driver.session.evaluate(READ_PATHNAME));
  const header = headerSchema.parse(await driver.session.evaluate(READ_PAGE_HEADER));
  const contentBelowList = contentBelowListSchema.parse(
    await driver.session.evaluate(READ_CONTENT_BELOW_LIST),
  );
  await driver.session.evaluate(SCROLL_TO_PAGE_END);
  await waitMilliseconds(SCROLL_SETTLE_MS);
  const box = headerBoxSchema.parse(await driver.session.evaluate(READ_PAGE_HEADER_BOX));
  const report = { ...header, ...box, contentBelowList };
  const violations = listScreenRuleViolations(target, report);
  console.log(
    `[screen-rule] ${target.route} -> ${landedOn}: ${violations.length === 0 ? 'ok' : violations.join('; ')}`,
  );
  return { report: { landedOn, ...report }, violations };
}

export async function measureScreenRule(
  driver: BandSessionDriver,
): Promise<Record<string, unknown>> {
  driver.reseed();
  await emulateSmallPhone(driver);
  await driver.signOut();
  const reports: Record<string, unknown> = {};
  const violationsByRoute: Record<string, string[]> = {};
  const record = async (target: ScreenRuleRoute): Promise<void> => {
    const measured = await measureScreen(driver, target);
    reports[target.route] = measured.report;
    violationsByRoute[target.route] = measured.violations;
  };
  for (const target of SIGNED_OUT_ROUTES) await record(target);
  await driver.signIn();
  const { routes } = await buildSignedInRoutePlan(driver);
  const known = await driver.readKnownRecords();
  const pastPractice = known.sessions.find((session) => session.kind === 'practice');
  const extraRoutes: readonly RouteTarget[] = [
    { route: '/catalog/add', url: '/catalog/add' },
    { route: '/sessions/slots', url: '/sessions/slots' },
    { route: '/sessions/:sessionId/audience', url: `/sessions/${known.concert.id}/audience` },
    {
      route: '/sessions/:sessionId/practice',
      url: `/sessions/${pastPractice?.id ?? known.concert.id}/practice`,
    },
    { route: '/setlists/:setlistId/order', url: `/setlists/${known.main.id}/order` },
  ];
  for (const target of [...routes, ...extraRoutes]) {
    if (STAGE_ROUTES.has(target.route)) continue;
    await record({ ...target, back: expectBackLink(target.route) });
  }
  await emulatePhone(driver.session);
  return {
    viewport: `${String(SMALL_PHONE.width)}x${String(SMALL_PHONE.height)}`,
    exempt: [...STAGE_ROUTES],
    ...summariseScreenRule(violationsByRoute),
    violationsByRoute,
    reports,
  };
}
