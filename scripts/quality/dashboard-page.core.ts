export interface PageParts {
  readonly markup: string;
  readonly scriptBodies: readonly string[];
  readonly faults: readonly string[];
}

export interface WidthMeasurement {
  readonly viewportWidth: number;
  readonly documentWidth: number;
}

export interface PageReport {
  readonly consoleErrors: readonly string[];
  readonly widths: readonly WidthMeasurement[];
  readonly sparklineBars: number;
  readonly enlargedChartBars: number;
}

export interface HarnessInput {
  readonly pageHtml: string;
  readonly d3Source: string;
  readonly dashSource: string;
}

export const DASHBOARD_TYPE_TOKENS = `:root {
  --cds-gap-lg: 1.25rem;
  --cds-gap-md: 0.75rem;
  --cds-gap-sm: 0.5rem;
  --cds-gap-xs: 0.375rem;
  --cds-pad-lg: 0.75rem;
  --cds-pad-md: 0.5rem;
  --cds-pad-sm: 0.375rem;
  --cds-pad-xs: 0.25rem;
  --cds-radius: 0.3125rem;
  --cds-border: rgb(0 0 0 / 0.08);
  --cds-font-size-title: 1.25rem;
  --cds-font-size-heading: 0.875rem;
  --cds-font-size-body: 0.8125rem;
  --cds-font-size-caption: 0.6875rem;
  --cds-font-weight-medium: 500;
  --cds-dur-slow: 0.45s;
  --cds-surface-popover: #ffffff;
  --cds-shadow-popover: 0 8px 24px #0000001f, 0 2px 6px #00000014;
  --cds-chart-grid: rgb(0 0 0 / 0.1);
  --cds-chart-muted: #c2c2c2;
  --cds-chart-status-critical: #dc3c3d;
  --color-bg: #ffffff;
  --color-fg: rgb(0 0 0 / 0.9);
  --color-fg-muted: rgb(0 0 0 / 0.465);
  --color-panel: #ffffff;
  --color-border-line: rgb(0 0 0 / 0.08);
  --color-ok: #006c10;
  --color-bad: #a42528;
  --font-anthropic-sans: ui-sans-serif, system-ui, sans-serif;
  --font-anthropic-serif: ui-serif, Georgia, serif;
}`;

const SCRIPT_WITH_ATTRIBUTES = 'carries attributes, which the dashboard type drops silently';
const NON_UNIFORM_SCALING = /preserveAspectRatio["'\s]*[,=]?["'\s]*none/g;
const NO_SPARKLINE = 'every sparkline drew no bar, so the chips show no series';
const NO_ENLARGED_CHART = 'the enlarged chart drew no bar, so opening a chip shows an empty modal';

export function splitPageHtml(pageHtml: string): PageParts {
  const scriptBodies: string[] = [];
  const faults: string[] = [];
  const markup = pageHtml.replaceAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
    (_match, attributes: string, body: string) => {
      if (attributes.trim().length > 0) {
        faults.push(`<script${attributes}> ${SCRIPT_WITH_ATTRIBUTES}`);
      }
      scriptBodies.push(body);
      return '';
    },
  );
  return { markup, scriptBodies, faults };
}

export function listNonUniformScalings(pageHtml: string): readonly string[] {
  return [...pageHtml.matchAll(NON_UNIFORM_SCALING)].map(
    (match) =>
      `${match[0].replace(/\s+/g, ' ')} scales the x and y axes by different factors, ` +
      'so bars, ticks and label text stretch when the box is redrawn at another width',
  );
}

export function buildHarnessHtml(input: HarnessInput): string {
  const { markup, scriptBodies } = splitPageHtml(input.pageHtml);
  const isolated = scriptBodies.map((body) => `<script>(() => {${body}})();</script>`).join('\n');
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    `<style>${DASHBOARD_TYPE_TOKENS}</style>`,
    '<style>html,body{margin:0;padding:0;background:var(--color-bg)}</style>',
    '</head><body>',
    `<div id="dash-root">${markup}</div>`,
    `<script>${input.d3Source}</script>`,
    `<script>${input.dashSource}</script>`,
    isolated,
    '</body></html>',
  ].join('\n');
}

function describeOverflow(measurement: WidthMeasurement): string {
  return (
    `at ${String(measurement.viewportWidth)} px the page is ` +
    `${String(measurement.documentWidth)} px wide, so the whole board scrolls sideways ` +
    'instead of the strip inside it'
  );
}

export function listPageFaults(report: PageReport): readonly string[] {
  return [
    ...[...new Set(report.consoleErrors)].map((error) => `the page threw: ${error}`),
    ...report.widths
      .filter((width) => width.documentWidth > width.viewportWidth)
      .map(describeOverflow),
    ...(report.sparklineBars === 0 ? [NO_SPARKLINE] : []),
    ...(report.enlargedChartBars === 0 ? [NO_ENLARGED_CHART] : []),
  ];
}
