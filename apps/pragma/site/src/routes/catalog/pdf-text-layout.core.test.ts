import { describe, expect, it } from 'vitest';
import { layOutPdfPage, layOutPdfText, type PdfTextItem } from './pdf-text-layout.core';

const CHARACTER_WIDTH = 6;
const LEFT_MARGIN = 50;
const LINE_HEIGHT = 14;

function item(text: string, column: number, row: number): PdfTextItem {
  return {
    text,
    x: LEFT_MARGIN + column * CHARACTER_WIDTH,
    y: 800 - row * LINE_HEIGHT,
    width: text.length * CHARACTER_WIDTH,
  };
}

describe('layOutPdfPage', () => {
  it('keeps each chord in the column it was printed in', () => {
    const page = [
      item("Ain't no sunshine when she's gone", 0, 1),
      item('Am', 0, 0),
      item('Em', 18, 0),
      item('G', 23, 0),
    ];
    expect(layOutPdfPage(page)).toBe("Am                Em   G\nAin't no sunshine when she's gone");
  });

  it('reads items a point apart in height as one line', () => {
    const page = [item('world', 6, 0), { ...item('hello', 0, 0), y: 801 }];
    expect(layOutPdfPage(page)).toBe('hello world');
  });

  it('separates two items that would touch with one space', () => {
    const page = [item('hello', 0, 0), item('world', 3, 0)];
    expect(layOutPdfPage(page)).toBe('hello world');
  });

  it('marks a wider gap between lines as a blank line', () => {
    const page = [item('one', 0, 0), item('two', 0, 1), item('three', 0, 2), item('four', 0, 4)];
    expect(layOutPdfPage(page)).toBe('one\ntwo\nthree\n\nfour');
  });

  it('skips items holding only spaces', () => {
    expect(layOutPdfPage([item('   ', 0, 0), item('word', 2, 0)])).toBe('word');
  });

  it('falls back to a usual character width when no item has a width', () => {
    expect(
      layOutPdfPage([
        { text: 'C', x: 50, y: 10, width: 0 },
        { text: 'G', x: 62, y: 10, width: 0 },
      ]),
    ).toBe('C G');
  });

  it('answers nothing for a page with no text layer', () => {
    expect(layOutPdfPage([])).toBe('');
  });
});

describe('layOutPdfText', () => {
  it('joins the pages that hold text with a blank line', () => {
    expect(layOutPdfText([[item('first', 0, 0)], [], [item('second', 0, 0)]])).toBe(
      'first\n\nsecond',
    );
  });

  it('answers nothing for a scanned PDF', () => {
    expect(layOutPdfText([[], []])).toBe('');
  });
});
