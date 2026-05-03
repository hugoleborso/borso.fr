import type { Palette } from './palettes.utils';
import type { ColoredRect } from './painting.utils';
import { seedToHex } from './url-state.utils';

const PNG_EXPORT_SIZE_PX = 2000;
const DESIGN_FRAME_REFERENCE_WIDTH_PX = 880;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function buildSvgDocument(rects: ColoredRect[], palette: Palette, lineWeight: number): string {
  const exportSize = PNG_EXPORT_SIZE_PX;
  const strokeScale = exportSize / DESIGN_FRAME_REFERENCE_WIDTH_PX;
  const svgElement = document.createElementNS(SVG_NAMESPACE, 'svg');
  svgElement.setAttribute('xmlns', SVG_NAMESPACE);
  svgElement.setAttribute('width', String(exportSize));
  svgElement.setAttribute('height', String(exportSize));
  svgElement.setAttribute('viewBox', `0 0 ${exportSize} ${exportSize}`);

  const backgroundElement = document.createElementNS(SVG_NAMESPACE, 'rect');
  backgroundElement.setAttribute('x', '0');
  backgroundElement.setAttribute('y', '0');
  backgroundElement.setAttribute('width', String(exportSize));
  backgroundElement.setAttribute('height', String(exportSize));
  backgroundElement.setAttribute('fill', palette.bg);
  svgElement.appendChild(backgroundElement);

  rects.forEach((rectangle) => {
    const rectElement = document.createElementNS(SVG_NAMESPACE, 'rect');
    rectElement.setAttribute('x', String(rectangle.x * exportSize));
    rectElement.setAttribute('y', String(rectangle.y * exportSize));
    rectElement.setAttribute('width', String(rectangle.width * exportSize));
    rectElement.setAttribute('height', String(rectangle.height * exportSize));
    rectElement.setAttribute('fill', rectangle.fill);
    rectElement.setAttribute('stroke', palette.line);
    rectElement.setAttribute('stroke-width', String(lineWeight * strokeScale));
    svgElement.appendChild(rectElement);
  });

  return new XMLSerializer().serializeToString(svgElement);
}

function rasterizeAndDownload(serializedSvg: string, fileName: string) {
  const svgBlob = new Blob([serializedSvg], { type: 'image/svg+xml' });
  const svgObjectUrl = URL.createObjectURL(svgBlob);
  const rasterImage = new Image();
  rasterImage.onload = () => {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = PNG_EXPORT_SIZE_PX;
    offscreenCanvas.height = PNG_EXPORT_SIZE_PX;
    const renderingContext = offscreenCanvas.getContext('2d');
    if (!renderingContext) return;
    renderingContext.drawImage(rasterImage, 0, 0);
    offscreenCanvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(pngBlob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(svgObjectUrl);
    }, 'image/png');
  };
  rasterImage.src = svgObjectUrl;
}

export function downloadCompositionPng(args: {
  rects: ColoredRect[];
  palette: Palette;
  lineWeight: number;
  seed: number;
}) {
  const serializedSvg = buildSvgDocument(args.rects, args.palette, args.lineWeight);
  rasterizeAndDownload(serializedSvg, `mondrian-${seedToHex(args.seed)}.png`);
}
