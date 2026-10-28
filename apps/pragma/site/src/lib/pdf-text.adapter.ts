/** @Feature songs */

import { z } from 'zod';
import type { PdfTextItem } from '../routes/catalog/pdf-text-layout.core';

const TRANSFORM_X_INDEX = 4;
const TRANSFORM_Y_INDEX = 5;
const transformSchema = z.array(z.number());

function readTextItem(item: object): PdfTextItem | null {
  if (!('str' in item) || typeof item.str !== 'string') return null;
  if (!('transform' in item) || !('width' in item) || typeof item.width !== 'number') return null;
  const transform = transformSchema.safeParse(item.transform);
  if (!transform.success) return null;
  return {
    text: item.str,
    x: transform.data[TRANSFORM_X_INDEX] ?? 0,
    y: transform.data[TRANSFORM_Y_INDEX] ?? 0,
    width: item.width,
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
