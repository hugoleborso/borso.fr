/** @Feature songs */

import { z } from 'zod';
import type { PdfTextItem } from '../routes/catalog/pdf-text-layout.core';

const TRANSFORM_X_INDEX = 4;
const TRANSFORM_Y_INDEX = 5;
const textItemSchema = z.object({
  str: z.string(),
  transform: z.array(z.number()),
  width: z.number(),
});

function readTextItem(item: unknown): PdfTextItem | null {
  const printedItem = textItemSchema.safeParse(item);
  if (!printedItem.success) return null;
  return {
    text: printedItem.data.str,
    x: printedItem.data.transform[TRANSFORM_X_INDEX] ?? 0,
    y: printedItem.data.transform[TRANSFORM_Y_INDEX] ?? 0,
    width: printedItem.data.width,
  };
}

// @FollowsBlueprint adapter-direct-upload
export async function readPdfTextItems(file: File): Promise<PdfTextItem[][]> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const pages: PdfTextItem[][] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items.flatMap((item) => {
        const textItem = readTextItem(item);
        return textItem === null ? [] : [textItem];
      }),
    );
  }
  await loadingTask.destroy();
  return pages;
}
