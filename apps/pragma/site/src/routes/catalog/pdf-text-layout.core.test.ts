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

  it('reads the character width as the median of the items, whatever order they come in', () => {
    const page = [
      { text: 'Am', x: LEFT_MARGIN, y: 800, width: 12 },
      { text: 'W', x: LEFT_MARGIN + 60, y: 800, width: 30 },
      { text: 'abcde', x: LEFT_MARGIN + 120, y: 800, width: 10 },
      { text: 'G', x: LEFT_MARGIN + 180, y: 800, width: 6 },
      { text: 'C', x: LEFT_MARGIN + 240, y: 800, width: 6 },
    ];
    expect(layOutPdfPage(page)).toBe('Am        W         abcde     G         C');
  });

  it('measures the character width from the items rather than assuming one', () => {
    const narrow = 5;
    const page = [
      { text: 'Am', x: LEFT_MARGIN, y: 800, width: 2 * narrow },
      { text: 'G', x: LEFT_MARGIN + 12 * narrow, y: 800, width: narrow },
      { text: 'hello', x: LEFT_MARGIN, y: 786, width: 5 * narrow },
    ];
    expect(layOutPdfPage(page)).toBe('Am          G\nhello');
  });

  it('reads items exactly two points apart in height as one line', () => {
    const page = [item('hello', 0, 0), { ...item('world', 6, 0), y: 798 }];
    expect(layOutPdfPage(page)).toBe('hello world');
  });

  it('orders the items of a line from left to right, whatever order they come in', () => {
    const page = [item('world', 6, 0), item('hello', 0, 0)];
    expect(layOutPdfPage(page)).toBe('hello world');
  });

  it('puts one space between a word and the next one starting right where it ends', () => {
    expect(layOutPdfPage([item('hello', 0, 0), item('world', 5, 0)])).toBe('hello world');
  });

  it('adds no second space after a word that already ends with one', () => {
    expect(layOutPdfPage([item('hello ', 0, 0), item('world', 3, 0)])).toBe('hello world');
  });

  it('keeps the indent at the start of a line and drops the spaces at its end', () => {
    expect(layOutPdfPage([item('  Am  ', 0, 0), item('verse', 0, 1)])).toBe('  Am\nverse');
  });

  it('reads no blank line on a page whose lines are mostly double spaced', () => {
    const page = [0, 1, 2, 4, 6].map((row) => item(`line ${String(row)}`, 0, row));
    expect(layOutPdfPage(page)).toBe('line 0\nline 1\nline 2\nline 4\nline 6');
  });

  it('marks a blank line only past 1.6 usual gaps, not at exactly 1.6', () => {
    const page = [800, 790, 780, 770, 754].map((height, index) => ({
      text: `line ${String(index)}`,
      x: LEFT_MARGIN,
      y: height,
      width: 6 * CHARACTER_WIDTH,
    }));
    expect(layOutPdfPage(page)).toBe('line 0\nline 1\nline 2\nline 3\nline 4');
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
