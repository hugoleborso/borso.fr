export const ANY_BACK_LINK = 'any';

export type ExpectedBackLink = string | null;

export interface ScreenRuleTarget {
  readonly route: string;
  readonly back: ExpectedBackLink;
}

export interface ContentBelowList {
  readonly list: string;
  readonly below: string;
}

export interface ScreenShapeReport {
  readonly hasHeader: boolean;
  readonly headerPosition: string;
  readonly backLinks: readonly string[];
  readonly headerTopAfterEnd: number | null;
  readonly headerBottomAfterEnd: number | null;
  readonly viewportHeight: number;
  readonly contentBelowList: readonly ContentBelowList[];
}

const FIXED_POSITIONS = new Set(['sticky', 'fixed']);
const EDGE_TOLERANCE_PX = 1;

function isHeaderOnScreen(report: ScreenShapeReport): boolean {
  if (report.headerTopAfterEnd === null || report.headerBottomAfterEnd === null) return false;
  return (
    report.headerTopAfterEnd >= -EDGE_TOLERANCE_PX &&
    report.headerBottomAfterEnd <= report.viewportHeight + EDGE_TOLERANCE_PX
  );
}

function listBackLinkViolations(target: ScreenRuleTarget, report: ScreenShapeReport): string[] {
  if (target.back === null) return [];
  if (target.back === ANY_BACK_LINK) {
    return report.backLinks.length > 0 ? [] : ['no back link in the header'];
  }
  return report.backLinks.includes(target.back)
    ? []
    : [`no back link to ${target.back} in the header`];
}

export function listScreenRuleViolations(
  target: ScreenRuleTarget,
  report: ScreenShapeReport,
): string[] {
  if (!report.hasHeader) return ['no page header'];
  const violations: string[] = [];
  if (!FIXED_POSITIONS.has(report.headerPosition)) {
    violations.push(`header is not fixed (position ${report.headerPosition})`);
  }
  if (!isHeaderOnScreen(report)) violations.push('header scrolled away at the end of the page');
  violations.push(...listBackLinkViolations(target, report));
  for (const found of report.contentBelowList) {
    violations.push(`${found.below} sits below the list ${found.list}`);
  }
  return violations;
}

export function summariseScreenRule(
  violationsByRoute: Readonly<Record<string, readonly string[]>>,
): { readonly routesWithViolations: number; readonly violations: number } {
  const counts = Object.values(violationsByRoute).map((violations) => violations.length);
  return {
    routesWithViolations: counts.filter((count) => count > 0).length,
    violations: counts.reduce((total, count) => total + count, 0),
  };
}
