import { canvas, lineWidth, minBlockSize } from './canvas.js';

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function chooseSplitDirection(rect) {
  const canSplitVertically = rect.width >= 2 * minBlockSize;
  const canSplitHorizontally = rect.height >= 2 * minBlockSize;
  if (canSplitVertically && canSplitHorizontally) {
    return Math.random() < 0.5 ? 'vertical' : 'horizontal';
  }
  if (canSplitVertically) return 'vertical';
  if (canSplitHorizontally) return 'horizontal';
  return null;
}

function makeVerticalLine(rect, splitX, animationMode) {
  const lineObj = {
    type: 'vertical',
    finalPos: splitX,
    y1: rect.y,
    y2: rect.y + rect.height,
  };
  if (animationMode === 'opposite') {
    lineObj.startPos = Math.random() < 0.5 ? -lineWidth : canvas.width + lineWidth;
    lineObj.currentPos = lineObj.startPos;
  } else {
    const lineLength = lineObj.y2 - lineObj.y1;
    lineObj.startOffset = Math.random() < 0.5 ? -lineLength - 20 : lineLength + 20;
    lineObj.currentOffset = lineObj.startOffset;
  }
  return lineObj;
}

function makeHorizontalLine(rect, splitY, animationMode) {
  const lineObj = {
    type: 'horizontal',
    finalPos: splitY,
    x1: rect.x,
    x2: rect.x + rect.width,
  };
  if (animationMode === 'opposite') {
    lineObj.startPos = Math.random() < 0.5 ? -lineWidth : canvas.height + lineWidth;
    lineObj.currentPos = lineObj.startPos;
  } else {
    const lineLength = lineObj.x2 - lineObj.x1;
    lineObj.startOffset = Math.random() < 0.5 ? -lineLength - 20 : lineLength + 20;
    lineObj.currentOffset = lineObj.startOffset;
  }
  return lineObj;
}

/**
 * Recursive subdivision. Returns an object with:
 *   - blocks: rectangular regions (each x, y, width, height)
 *   - splittingLines: line objects (each with type, endpoints, anim state)
 * `totalSplits` is the number of internal splits (total lines minus 4 borders).
 * `animationMode` is 'opposite' or 'matching'.
 */
export function generateSubdivisionSplits(totalSplits, animationMode) {
  const rects = [{ x: 0, y: 0, width: canvas.width, height: canvas.height }];
  const splittingLines = [];

  for (let i = 0; i < totalSplits; i++) {
    const splittable = rects.filter(
      (rect) => rect.width >= 2 * minBlockSize || rect.height >= 2 * minBlockSize,
    );
    if (splittable.length === 0) break;

    const rectIndex = Math.floor(Math.random() * splittable.length);
    const rect = splittable[rectIndex];
    const globalIndex = rects.indexOf(rect);

    const splitDirection = chooseSplitDirection(rect);
    if (splitDirection === 'vertical') {
      const splitX = Math.floor(
        randomBetween(rect.x + minBlockSize, rect.x + rect.width - minBlockSize),
      );
      const leftRect = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
      const rightRect = {
        x: splitX,
        y: rect.y,
        width: rect.x + rect.width - splitX,
        height: rect.height,
      };
      rects.splice(globalIndex, 1, leftRect, rightRect);
      splittingLines.push(makeVerticalLine(rect, splitX, animationMode));
    } else if (splitDirection === 'horizontal') {
      const splitY = Math.floor(
        randomBetween(rect.y + minBlockSize, rect.y + rect.height - minBlockSize),
      );
      const topRect = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
      const bottomRect = {
        x: rect.x,
        y: splitY,
        width: rect.width,
        height: rect.y + rect.height - splitY,
      };
      rects.splice(globalIndex, 1, topRect, bottomRect);
      splittingLines.push(makeHorizontalLine(rect, splitY, animationMode));
    }
  }
  return { blocks: rects, splittingLines };
}
