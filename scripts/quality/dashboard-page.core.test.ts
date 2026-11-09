import { describe, expect, it } from 'vitest';
import {
  buildHarnessHtml,
  DASHBOARD_TYPE_TOKENS,
  listNonUniformScalings,
  listPageFaults,
  splitPageHtml,
} from './dashboard-page.core';

const PAGE = `<div class="s3"><h1>Board</h1></div>
<script>
  window.s3 = { one: 1 };
</script>
<script>
  window.s3.two = 2;
</script>`;

describe('splitPageHtml', () => {
  it('takes every script body out of the markup, in order', () => {
    const parts = splitPageHtml(PAGE);
    expect(parts.markup).toBe('<div class="s3"><h1>Board</h1></div>\n\n');
    expect(parts.scriptBodies).toEqual([
      '\n  window.s3 = { one: 1 };\n',
      '\n  window.s3.two = 2;\n',
    ]);
    expect(parts.faults).toEqual([]);
  });

  it('reports a script tag carrying attributes, which the type drops', () => {
    expect(splitPageHtml('<script type="module">run();</script>').faults).toEqual([
      '<script type="module"> carries attributes, which the dashboard type drops silently',
    ]);
  });

  it('accepts a script tag whose only attribute text is blank', () => {
    expect(splitPageHtml('<script >run();</script>').faults).toEqual([]);
  });

  it('reads a page with no script at all', () => {
    const parts = splitPageHtml('<p>nothing</p>');
    expect(parts.scriptBodies).toEqual([]);
    expect(parts.markup).toBe('<p>nothing</p>');
  });
});

describe('listNonUniformScalings', () => {
  it('finds the markup form', () => {
    expect(listNonUniformScalings('<svg preserveAspectRatio="none">')).toEqual([
      'preserveAspectRatio="none scales the x and y axes by different factors, so bars, ' +
        'ticks and label text stretch when the box is redrawn at another width',
    ]);
  });

  it('finds the d3 attribute form and collapses its spacing', () => {
    expect(listNonUniformScalings(".attr('preserveAspectRatio',\n        'none')")[0]).toMatch(
      /^preserveAspectRatio', 'none scales the x and y axes/,
    );
  });

  it('stays silent on a uniform scaling', () => {
    expect(listNonUniformScalings('<svg preserveAspectRatio="xMidYMid meet">')).toEqual([]);
  });
});

describe('buildHarnessHtml', () => {
  const harness = buildHarnessHtml({
    pageHtml: PAGE,
    d3Source: 'window.d3 = {};',
    dashSource: 'window.dash = {};',
  });

  it('wraps each page script in a scope of its own, keeping their order', () => {
    expect(harness).toContain('<script>(() => {\n  window.s3 = { one: 1 };\n})();</script>');
    expect(harness.indexOf('window.s3 = { one: 1 }')).toBeLessThan(
      harness.indexOf('window.s3.two = 2'),
    );
  });

  it('mounts the markup in the dashboard root, with d3 and dash before it', () => {
    expect(harness).toContain('<div id="dash-root"><div class="s3"><h1>Board</h1></div>');
    expect(harness.indexOf('window.d3 = {};')).toBeLessThan(
      harness.indexOf('window.s3 = { one: 1 }'),
    );
    expect(harness.indexOf('window.dash = {};')).toBeLessThan(
      harness.indexOf('window.s3 = { one: 1 }'),
    );
  });

  it('carries the type tokens, so a length the page reads is not an empty value', () => {
    expect(harness).toContain('--cds-gap-lg: 1.25rem;');
    expect(DASHBOARD_TYPE_TOKENS).toContain('--cds-font-size-body: 0.8125rem;');
    expect(harness).toContain('<!doctype html>');
    expect(harness).toContain('background:var(--color-bg)');
  });
});

describe('listPageFaults', () => {
  const clean = {
    consoleErrors: [],
    widths: [{ viewportWidth: 390, documentWidth: 390 }],
    sparklineBars: 51,
    enlargedChartBars: 8,
  };

  it('passes a page that fits its viewport exactly and drew its bars', () => {
    expect(listPageFaults(clean)).toEqual([]);
  });

  it('names every error the page threw, once each however often it fired', () => {
    expect(
      listPageFaults({
        ...clean,
        consoleErrors: ['drawChart is not defined', 'drawChart is not defined', 'other'],
      }),
    ).toEqual(['the page threw: drawChart is not defined', 'the page threw: other']);
  });

  it('names a viewport the page is wider than', () => {
    expect(
      listPageFaults({ ...clean, widths: [{ viewportWidth: 390, documentWidth: 738 }] }),
    ).toEqual([
      'at 390 px the page is 738 px wide, so the whole board scrolls sideways instead of ' +
        'the strip inside it',
    ]);
  });

  it('names a blank sparkline and a blank enlarged chart', () => {
    expect(listPageFaults({ ...clean, sparklineBars: 0, enlargedChartBars: 0 })).toEqual([
      'every sparkline drew no bar, so the chips show no series',
      'the enlarged chart drew no bar, so opening a chip shows an empty modal',
    ]);
  });
});
