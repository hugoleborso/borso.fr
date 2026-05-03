function setDefaultCanvasSize(canvas) {
  const defaultSize = Math.floor(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8));
  document.getElementById('widthInput').value = defaultSize;
  document.getElementById('heightInput').value = defaultSize;
  canvas.width = defaultSize;
  canvas.height = defaultSize;
}

export const canvas = document.getElementById('paintingCanvas');
export const ctx = canvas.getContext('2d');

setDefaultCanvasSize(canvas);

export const lineWidth = Math.max(2, Math.min(canvas.width, canvas.height) * 0.005);
export const minBlockSize = Math.max(20, Math.min(canvas.width, canvas.height) * 0.05);
export const lineAnimDuration = 1500;
export const fadeDuration = 1500;
