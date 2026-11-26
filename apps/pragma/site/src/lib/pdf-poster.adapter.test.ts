import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPdfPosterAsPng } from './pdf-poster.adapter';

const ONLY_PAGE = vi.hoisted(() => 1);

interface PaintSize {
  readonly width: number;
  readonly height: number;
}

interface FakeContext {
  readonly paint: (size: PaintSize) => void;
  readonly getImageData: (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => { data: Uint8ClampedArray };
  readonly drawImage: ReturnType<typeof vi.fn>;
}

interface FakeRenderParameters {
  readonly canvasContext: FakeContext;
  readonly viewport: PaintSize;
}

const destroyLoadingTask = vi.fn(async () => undefined);
const openedDocuments = vi.hoisted((): unknown[] => []);

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (source: unknown) => {
    openedDocuments.push(source);
    return {
      promise: Promise.resolve({
        getPage: async (pageNumber: number) => {
          if (pageNumber !== ONLY_PAGE) throw new Error('Invalid page request.');
          return {
            getViewport: ({ scale }: { scale: number }) => ({
              width: 2_000 * scale,
              height: 1_500 * scale,
            }),
            render: ({ canvasContext, viewport }: FakeRenderParameters) => {
              canvasContext.paint(viewport);
              return { promise: Promise.resolve() };
            },
          };
        },
      }),
      destroy: destroyLoadingTask,
    };
  },
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: '/assets/pdf.worker.js' }));

function whitePixels(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4).fill(255);
}

function createFakeContext(): FakeContext {
  let painted: PaintSize | null = null;
  return {
    paint: (size) => {
      painted = size;
    },
    getImageData: (_x, _y, width, height) => {
      const pixels = whitePixels(width, height);
      if (painted?.width === width && painted.height === height) {
        pixels.set([0, 0, 0, 255], (1 * width + 2) * 4);
        pixels.set([0, 0, 0, 255], (40 * width + 30) * 4);
      }
      return { data: pixels };
    },
    drawImage: vi.fn(),
  };
}

const canvases: HTMLCanvasElement[] = [];

const realGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
const realToBlob = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toBlob');

function stubCanvas(context: FakeContext | null, blob: Blob | null): void {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, contextType: string) {
      canvases.push(this);
      return contextType === '2d' ? context : null;
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: (resolve: (value: Blob | null) => void) => resolve(blob),
  });
}

function restoreCanvas(): void {
  if (realGetContext !== undefined) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', realGetContext);
  }
  if (realToBlob !== undefined) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', realToBlob);
  }
}

function pdfFile(): File {
  return new File(['%PDF'], 'affiche.pdf', { type: 'application/pdf' });
}

// @FollowsBlueprint test-pure-unit
describe('renderPdfPosterAsPng', () => {
  beforeEach(() => {
    openedDocuments.length = 0;
    canvases.length = 0;
    destroyLoadingTask.mockClear();
  });

  afterEach(() => {
    restoreCanvas();
  });

  it('draws the first page within the pixel budget, trims its white margins and answers a PNG', async () => {
    const context = createFakeContext();
    stubCanvas(context, new Blob(['png'], { type: 'image/png' }));

    const poster = await renderPdfPosterAsPng(pdfFile());

    expect(poster.name).toBe('poster.png');
    expect(poster.type).toBe('image/png');
    expect(openedDocuments).toEqual([{ data: new Uint8Array(new TextEncoder().encode('%PDF')) }]);
    expect(canvases.map((canvas) => [canvas.width, canvas.height])).toEqual([
      [2000, 1500],
      [29, 40],
    ]);
    expect(context.drawImage).toHaveBeenCalledWith(canvases[0], 2, 1, 29, 40, 0, 0, 29, 40);
    expect(destroyLoadingTask).toHaveBeenCalledOnce();
  });

  it('fails, and still lets the document go, when the browser has no 2d canvas', async () => {
    stubCanvas(null, null);

    await expect(renderPdfPosterAsPng(pdfFile())).rejects.toThrow('no 2d canvas context');
    expect(destroyLoadingTask).toHaveBeenCalledOnce();
  });

  it('fails when the canvas cannot be encoded', async () => {
    stubCanvas(createFakeContext(), null);

    await expect(renderPdfPosterAsPng(pdfFile())).rejects.toThrow('could not be encoded');
  });
});
