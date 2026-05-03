export function hexToRGB(colorStr) {
  const r = Number.parseInt(colorStr.slice(1, 3), 16);
  const g = Number.parseInt(colorStr.slice(3, 5), 16);
  const b = Number.parseInt(colorStr.slice(5, 7), 16);
  return { r, g, b };
}

export function interpolateColor(target, factor) {
  const r = Math.round(255 + factor * (target.r - 255));
  const g = Math.round(255 + factor * (target.g - 255));
  const b = Math.round(255 + factor * (target.b - 255));
  return `rgb(${r},${g},${b})`;
}
