import { canvas, ctx, fadeDuration, lineAnimDuration, lineWidth } from './canvas.js';
import { getSelectedColors } from './color-grid.js';
import { hexToRGB, interpolateColor } from './colors.js';
import { generateSubdivisionSplits } from './subdivision.js';

let lines = [];
let blocks = [];
let animationPhase = 0;
let linesAnimationStartTime = null;
let fadeAnimationStartTime = null;

function getAnimationMode() {
  return document.querySelector('input[name="animationMode"]:checked').value;
}

function buildBorderLines(animationMode) {
  const left = { type: 'vertical', finalPos: 0, y1: 0, y2: canvas.height };
  const right = { type: 'vertical', finalPos: canvas.width, y1: 0, y2: canvas.height };
  const top = { type: 'horizontal', finalPos: 0, x1: 0, x2: canvas.width };
  const bottom = { type: 'horizontal', finalPos: canvas.height, x1: 0, x2: canvas.width };

  if (animationMode === 'opposite') {
    left.startPos = -lineWidth;
    left.currentPos = left.startPos;
    right.startPos = canvas.width + lineWidth;
    right.currentPos = right.startPos;
    top.startPos = -lineWidth;
    top.currentPos = top.startPos;
    bottom.startPos = canvas.height + lineWidth;
    bottom.currentPos = bottom.startPos;
  } else {
    const verticalLength = canvas.height;
    left.startOffset = Math.random() < 0.5 ? -verticalLength - 20 : verticalLength + 20;
    left.currentOffset = left.startOffset;
    right.startOffset = Math.random() < 0.5 ? -verticalLength - 20 : verticalLength + 20;
    right.currentOffset = right.startOffset;
    const horizontalLength = canvas.width;
    top.startOffset = Math.random() < 0.5 ? -horizontalLength - 20 : horizontalLength + 20;
    top.currentOffset = top.startOffset;
    bottom.startOffset = Math.random() < 0.5 ? -horizontalLength - 20 : horizontalLength + 20;
    bottom.currentOffset = bottom.startOffset;
  }
  return [left, right, top, bottom];
}

function clearCanvasWhite() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function strokeLines(strokeFn) {
  ctx.strokeStyle = 'black';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (const line of lines) {
    strokeFn(line);
  }
  ctx.stroke();
}

function advanceLineAnimation(line, progress, animationMode) {
  if (animationMode === 'opposite') {
    line.currentPos = line.startPos + progress * (line.finalPos - line.startPos);
  } else {
    line.currentOffset = line.startOffset + progress * (0 - line.startOffset);
  }
}

function strokeLineAt(line, animationMode) {
  if (animationMode === 'opposite') {
    if (line.type === 'vertical') {
      ctx.moveTo(line.currentPos, line.y1);
      ctx.lineTo(line.currentPos, line.y2);
    } else {
      ctx.moveTo(line.x1, line.currentPos);
      ctx.lineTo(line.x2, line.currentPos);
    }
  } else {
    if (line.type === 'vertical') {
      ctx.moveTo(line.finalPos, line.y1 + line.currentOffset);
      ctx.lineTo(line.finalPos, line.y2 + line.currentOffset);
    } else {
      ctx.moveTo(line.x1 + line.currentOffset, line.finalPos);
      ctx.lineTo(line.x2 + line.currentOffset, line.finalPos);
    }
  }
}

function strokeLineFinal(line) {
  if (line.type === 'vertical') {
    ctx.moveTo(line.finalPos, line.y1);
    ctx.lineTo(line.finalPos, line.y2);
  } else {
    ctx.moveTo(line.x1, line.finalPos);
    ctx.lineTo(line.x2, line.finalPos);
  }
}

function drawLinesPhase(timestamp) {
  if (!linesAnimationStartTime) linesAnimationStartTime = timestamp;
  const progress = Math.min((timestamp - linesAnimationStartTime) / lineAnimDuration, 1);
  const animationMode = getAnimationMode();

  for (const line of lines) {
    advanceLineAnimation(line, progress, animationMode);
  }

  clearCanvasWhite();
  strokeLines((line) => strokeLineAt(line, animationMode));

  if (progress < 1) {
    requestAnimationFrame(animationLoop);
  } else {
    animationPhase = 2;
    fadeAnimationStartTime = null;
    requestAnimationFrame(animationLoop);
  }
}

function drawFadePhase(timestamp) {
  if (!fadeAnimationStartTime) fadeAnimationStartTime = timestamp;
  const progress = Math.min((timestamp - fadeAnimationStartTime) / fadeDuration, 1);

  clearCanvasWhite();

  for (const block of blocks) {
    ctx.fillStyle = interpolateColor(block.targetColor, progress);
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }

  strokeLines(strokeLineFinal);

  if (progress < 1) {
    requestAnimationFrame(animationLoop);
  } else {
    animationPhase = 0;
    document.getElementById('downloadButton').style.display = 'inline-block';
  }
}

function animationLoop(timestamp) {
  if (animationPhase === 1) {
    drawLinesPhase(timestamp);
  } else if (animationPhase === 2) {
    drawFadePhase(timestamp);
  }
}

export function generatePainting() {
  document.getElementById('downloadButton').style.display = 'none';

  const widthVal = Number.parseInt(document.getElementById('widthInput').value, 10);
  const heightVal = Number.parseInt(document.getElementById('heightInput').value, 10);
  const linesVal = Number.parseInt(document.getElementById('linesInput').value, 10);
  canvas.width = widthVal;
  canvas.height = heightVal;

  clearCanvasWhite();

  const animationMode = getAnimationMode();
  const colorStrings = getSelectedColors();

  const splits = Math.max(0, linesVal);
  const subdivResult = generateSubdivisionSplits(splits, animationMode);
  blocks = subdivResult.blocks;

  const borderLines = buildBorderLines(animationMode);
  lines = borderLines.concat(subdivResult.splittingLines);

  for (const block of blocks) {
    const colorChoice = colorStrings[Math.floor(Math.random() * colorStrings.length)];
    block.targetColor = hexToRGB(colorChoice);
  }

  animationPhase = 1;
  linesAnimationStartTime = null;
  fadeAnimationStartTime = null;
  requestAnimationFrame(animationLoop);

  canvas.scrollIntoView({ behavior: 'smooth' });
}

export function downloadImage() {
  const link = document.createElement('a');
  link.download = 'mondrian.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
