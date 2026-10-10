import { describe, expect, it } from 'vitest';
import { escapeHtml, renderQualityPage } from './quality-page.core';

describe('escapeHtml', () => {
  it('escapes the five characters that change meaning in markup', () => {
    expect(escapeHtml(`a & b < c > d "e" 'f'`)).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;',
    );
  });

  it('leaves other text alone', () => {
    expect(escapeHtml('plain · text')).toBe('plain · text');
  });
});

function renderSample(): string {
  return renderQualityPage('Weak <points>', '<p>body</p>');
}

describe('renderQualityPage', () => {
  it('wraps the body in a document that follows the reader light or dark theme', () => {
    const page = renderSample();
    expect(page.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
    expect(page).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(page).toContain('<meta name="color-scheme" content="light dark">');
    expect(page).toContain('@media (prefers-color-scheme:dark)');
    expect(page.endsWith('<p>body</p>\n</main></body></html>\n')).toBe(true);
  });

  it('escapes the title in both places it appears', () => {
    const page = renderSample();
    expect(page).toContain('<title>Weak &lt;points&gt;</title>');
    expect(page).toContain('<h1>Weak &lt;points&gt;</h1>\n<p>body</p>');
  });
});
