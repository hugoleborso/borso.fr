import { describe, expect, it, vi } from 'vitest';
import { readPdfTextItems } from './pdf-text.adapter';

const destroyLoadingTask = vi.fn(async () => undefined);
const openedDocuments = vi.hoisted((): unknown[] => []);
const pageItems = [
  [
    { str: 'Am', transform: [1, 0, 0, 1, 50, 800], width: 12 },
    { type: 'beginMarkedContent' },
    { str: 7, transform: [1, 0, 0, 1, 0, 0], width: 1 },
    { str: 'no width', transform: [1, 0, 0, 1, 0, 0] },
    { str: 'no transform', width: 4 },
    { str: 'bad transform', transform: ['a'], width: 4 },
    { str: 'short', transform: [1], width: 4 },
  ],
  [],
];

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (source: unknown) => {
    openedDocuments.push(source);
    return {
      promise: Promise.resolve({
        numPages: pageItems.length,
        getPage: async (pageNumber: number) => ({
          getTextContent: async () => ({ items: pageItems[pageNumber - 1] ?? [] }),
        }),
      }),
      destroy: destroyLoadingTask,
    };
  },
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.js' }));

describe('readPdfTextItems', () => {
  it('answers the text items of every page with their position, and lets the document go', async () => {
    const file = new File(['%PDF'], 'chart.pdf', { type: 'application/pdf' });

    const pages = await readPdfTextItems(file);

    expect(pages).toEqual([
      [
        { text: 'Am', x: 50, y: 800, width: 12 },
        { text: 'short', x: 0, y: 0, width: 4 },
      ],
      [],
    ]);
    expect(destroyLoadingTask).toHaveBeenCalledOnce();
    expect(openedDocuments).toEqual([{ data: new Uint8Array(new TextEncoder().encode('%PDF')) }]);
  });
});
