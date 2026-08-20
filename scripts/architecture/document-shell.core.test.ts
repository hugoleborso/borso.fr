import { describe, expect, it } from 'vitest';
import { wrapInDocumentShell } from './document-shell.core';

const headOf = (document: string) => document.slice(0, document.indexOf('</head>'));
const bodyOf = (document: string) => document.slice(document.indexOf('<body>'));

describe('wrapInDocumentShell', () => {
  it('renders a body that carried a title as a whole document', () => {
    expect(
      wrapInDocumentShell('<title>Pragma architecture</title>\n<style>a{}</style>\n<p>map</p>'),
    ).toBe(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Pragma architecture</title>
</head>
<body>
<style>a{}</style>
<p>map</p>
</body>
</html>
`);
  });

  it('names the document itself when the body carried no title, and trims what it was handed', () => {
    expect(wrapInDocumentShell('\n  <p>map</p>\n\n')).toBe(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Architecture</title>
</head>
<body>
<p>map</p>
</body>
</html>
`);
  });

  it('opens with a doctype, so the browser leaves quirks mode', () => {
    expect(wrapInDocumentShell('<p>map</p>').startsWith('<!doctype html>')).toBe(true);
  });

  it('declares the encoding, so the page does not depend on the host sending one', () => {
    expect(headOf(wrapInDocumentShell('<p>map</p>'))).toContain('<meta charset="utf-8">');
  });

  it('declares the viewport, so a phone lays the page out at its own width', () => {
    expect(headOf(wrapInDocumentShell('<p>map</p>'))).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
  });

  it('leaves no title behind in the body it lifted one out of', () => {
    const document = wrapInDocumentShell('<title>Pragma architecture</title>\n<p>map</p>');
    expect(headOf(document)).toContain('<title>Pragma architecture</title>');
    expect(bodyOf(document)).toBe('<body>\n<p>map</p>\n</body>\n</html>\n');
  });

  it('keeps the styles in the body rather than parsing them out', () => {
    expect(
      bodyOf(wrapInDocumentShell('<title>x</title>\n<style>a{}</style>\n<p>map</p>')),
    ).toContain('<style>a{}</style>');
  });
});
