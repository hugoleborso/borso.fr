/** @Feature songs */

export interface PdfTextItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

interface PdfLine {
  readonly y: number;
  readonly items: PdfTextItem[];
}

const SAME_LINE_TOLERANCE = 2;
const BLANK_LINE_GAP_FACTOR = 1.6;
const FALLBACK_CHARACTER_WIDTH = 6;
const PAGE_SEPARATOR = '\n\n';
const HALVES = 2;

function median(values: readonly number[], fallback: number): number {
  const sorted = values.toSorted((first, second) => first - second);
  const middle = sorted[Math.floor(sorted.length / HALVES)];
  return middle ?? fallback;
}

function readCharacterWidth(items: readonly PdfTextItem[]): number {
  const widths = items
    .filter((item) => item.width > 0)
    .map((item) => item.width / item.text.length);
  return median(widths, FALLBACK_CHARACTER_WIDTH);
}

function groupIntoLines(items: readonly PdfTextItem[]): PdfLine[] {
  const lines: PdfLine[] = [];
  for (const item of items.toSorted((first, second) => second.y - first.y)) {
    const line = lines.at(-1);
    if (line !== undefined && Math.abs(line.y - item.y) <= SAME_LINE_TOLERANCE) {
      line.items.push(item);
      continue;
    }
    lines.push({ y: item.y, items: [item] });
  }
  return lines;
}

function renderLine(line: PdfLine, leftMargin: number, characterWidth: number): string {
  let rendered = '';
  for (const item of line.items.toSorted((first, second) => first.x - second.x)) {
    const column = Math.round((item.x - leftMargin) / characterWidth);
    if (rendered.length < column) rendered = rendered.padEnd(column, ' ');
    else if (rendered.length > 0 && !rendered.endsWith(' ')) rendered += ' ';
    rendered += item.text;
  }
  return rendered.trimEnd();
}

interface SpacedLine {
  readonly line: PdfLine;
  readonly gapAbove: number;
}

function measureGapsAbove(lines: readonly PdfLine[]): SpacedLine[] {
  let previousY: number | null = null;
  const spaced: SpacedLine[] = [];
  for (const line of lines) {
    spaced.push({ line, gapAbove: previousY === null ? 0 : previousY - line.y });
    previousY = line.y;
  }
  return spaced;
}

// @FollowsBlueprint core-projection
export function layOutPdfPage(pageItems: readonly PdfTextItem[]): string {
  const printedItems = pageItems.filter((item) => item.text.trim().length > 0);
  if (printedItems.length === 0) return '';
  const characterWidth = readCharacterWidth(printedItems);
  const leftMargin = Math.min(...printedItems.map((item) => item.x));
  const spacedLines = measureGapsAbove(groupIntoLines(printedItems));
  const usualGap = median(
    spacedLines.slice(1).map((spaced) => spaced.gapAbove),
    0,
  );
  return spacedLines
    .map(({ line, gapAbove }) => {
      const text = renderLine(line, leftMargin, characterWidth);
      const isAfterBlank = usualGap > 0 && gapAbove > usualGap * BLANK_LINE_GAP_FACTOR;
      return isAfterBlank ? `\n${text}` : text;
    })
    .join('\n');
}

export function layOutPdfText(pages: readonly (readonly PdfTextItem[])[]): string {
  return pages
    .map((page) => layOutPdfPage(page))
    .filter((pageText) => pageText.length > 0)
    .join(PAGE_SEPARATOR);
}
