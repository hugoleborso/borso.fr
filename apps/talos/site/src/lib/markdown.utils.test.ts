import { describe, expect, it } from 'vitest';
import { renderMarkdownToSafeHtml } from './markdown.utils';

describe('renderMarkdownToSafeHtml', () => {
  it('renders headings and lists', () => {
    expect(renderMarkdownToSafeHtml('# Titre\n\n- un')).toBe(
      '<h1>Titre</h1>\n<ul>\n<li>un</li>\n</ul>\n',
    );
  });

  it('renders a wikilink as an in-app anchor', () => {
    expect(renderMarkdownToSafeHtml('[[second-brain/moi|Alex]]')).toBe(
      '<p><a href="/brain/page/second-brain/moi">Alex</a></p>\n',
    );
  });

  it('removes scripts and inline handlers', () => {
    const html = renderMarkdownToSafeHtml(
      '<img src="x" onerror="alert(1)"><script>alert(2)</script>',
    );
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
  });

  it('keeps a single line break, as Talos writes its briefs', () => {
    expect(renderMarkdownToSafeHtml('un\ndeux')).toBe('<p>un<br>deux</p>\n');
  });

  it('renders GitHub tables', () => {
    expect(renderMarkdownToSafeHtml('| a |\n|---|\n| b |')).toContain('<td>b</td>');
  });

  it('keeps a horizontal rule that is not a front matter fence', () => {
    expect(renderMarkdownToSafeHtml('# Lucie\n\n---\n\nfin')).toContain('<hr>');
  });

  it('does not render the front matter as text', () => {
    expect(renderMarkdownToSafeHtml('---\ntype: x\n---\nCorps')).toBe('<p>Corps</p>\n');
  });
});
