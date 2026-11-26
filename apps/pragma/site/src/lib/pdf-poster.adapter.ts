/** @Feature concert-registrations */

import {
  findContentBounds,
  selectRenderScale,
  trimAntialiasedFringe,
} from '../routes/concerts/poster-pdf.core';

const FIRST_PAGE = 1;
const POSTER_FILE_NAME = 'poster.png';
const PNG_TYPE = 'image/png';
const UNIT_SCALE = 1;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function readContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d canvas context in this browser');
  return context;
}

async function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, PNG_TYPE);
  });
  if (blob === null) throw new Error('the canvas could not be encoded as a PNG');
  return blob;
}

// @FollowsBlueprint adapter-direct-upload
export async function renderPdfPosterAsPng(file: File): Promise<File> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const document = await loadingTask.promise;
    const page = await document.getPage(FIRST_PAGE);
    const pageSize = page.getViewport({ scale: UNIT_SCALE });
    const viewport = page.getViewport({
      scale: selectRenderScale(pageSize.width, pageSize.height),
    });
    const drawn = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const drawnContext = readContext(drawn);
    await page.render({ canvas: drawn, canvasContext: drawnContext, viewport }).promise;
    const pixels = drawnContext.getImageData(0, 0, drawn.width, drawn.height);
    const bounds = trimAntialiasedFringe(
      pixels.data,
      drawn.width,
      findContentBounds(pixels.data, drawn.width, drawn.height),
    );
    const trimmed = createCanvas(bounds.width, bounds.height);
    readContext(trimmed).drawImage(
      drawn,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    return new File([await encodePng(trimmed)], POSTER_FILE_NAME, { type: PNG_TYPE });
  } finally {
    await loadingTask.destroy();
  }
}
