import { useCallback, useEffect, useRef } from 'react';

const DRIFT_PHASE_PER_RECT = 0.61;
const DRIFT_TIME_SCALE_X = 0.7;
const DRIFT_TIME_SCALE_Y = 0.5;
const DRIFT_TIME_SCALE_ROTATION = 0.3;
const DRIFT_PHASE_Y_MULTIPLIER = 1.3;
const DRIFT_TRANSLATION_AMPLITUDE_PX = 4;
const DRIFT_ROTATION_AMPLITUDE_DEG = 0.3;

const BREATHE_PHASE_PER_RECT = 0.31;
const BREATHE_TIME_SCALE_SCALE = 0.9;
const BREATHE_TIME_SCALE_DRIFT = 0.4;
const BREATHE_SCALE_AMPLITUDE = 0.04;
const BREATHE_DRIFT_AMPLITUDE_PX = 1.5;

const ANIMATION_MODES = ['still', 'drift', 'breathe', 'cascade'] as const;
export type AnimationMode = (typeof ANIMATION_MODES)[number];

const ANIMATION_MODE_SET: ReadonlySet<string> = new Set(ANIMATION_MODES);
export function isAnimationMode(value: string): value is AnimationMode {
  return ANIMATION_MODE_SET.has(value);
}

function clearTransforms(canvasNode: HTMLDivElement) {
  canvasNode.querySelectorAll<HTMLElement>('.rect').forEach((rectElement) => {
    rectElement.style.transform = '';
  });
}

function applyDriftTransforms(canvasNode: HTMLDivElement, secondsElapsed: number) {
  canvasNode.querySelectorAll<HTMLElement>('.rect').forEach((rectElement, rectIndex) => {
    const phase = rectIndex * DRIFT_PHASE_PER_RECT;
    const offsetX =
      Math.sin(secondsElapsed * DRIFT_TIME_SCALE_X + phase) * DRIFT_TRANSLATION_AMPLITUDE_PX;
    const offsetY =
      Math.cos(secondsElapsed * DRIFT_TIME_SCALE_Y + phase * DRIFT_PHASE_Y_MULTIPLIER) *
      DRIFT_TRANSLATION_AMPLITUDE_PX;
    const rotationDegrees =
      Math.sin(secondsElapsed * DRIFT_TIME_SCALE_ROTATION + phase) * DRIFT_ROTATION_AMPLITUDE_DEG;
    rectElement.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotationDegrees}deg)`;
  });
}

function applyBreatheTransforms(canvasNode: HTMLDivElement, secondsElapsed: number) {
  canvasNode.querySelectorAll<HTMLElement>('.rect').forEach((rectElement, rectIndex) => {
    const phase = rectIndex * BREATHE_PHASE_PER_RECT;
    const scaleFactor =
      1 + Math.sin(secondsElapsed * BREATHE_TIME_SCALE_SCALE + phase) * BREATHE_SCALE_AMPLITUDE;
    const offsetX =
      Math.cos(secondsElapsed * BREATHE_TIME_SCALE_DRIFT + phase) * BREATHE_DRIFT_AMPLITUDE_PX;
    rectElement.style.transform = `translate(${offsetX}px, 0) scale(${scaleFactor})`;
  });
}

export function useAnimation(
  mode: AnimationMode,
  reducedMotion: boolean,
): (node: HTMLDivElement | null) => void {
  const canvasNodeRef = useRef<HTMLDivElement | null>(null);
  const rafHandleRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafHandleRef.current !== null) cancelAnimationFrame(rafHandleRef.current);
    const canvasNode = canvasNodeRef.current;
    if (!canvasNode) return;

    if (mode === 'still' || mode === 'cascade' || reducedMotion) {
      clearTransforms(canvasNode);
      return;
    }

    const startTimestamp = performance.now();
    const tick = (now: number) => {
      const liveCanvas = canvasNodeRef.current;
      if (!liveCanvas) return;
      const secondsElapsed = (now - startTimestamp) / 1000;
      if (mode === 'drift') applyDriftTransforms(liveCanvas, secondsElapsed);
      else if (mode === 'breathe') applyBreatheTransforms(liveCanvas, secondsElapsed);
      rafHandleRef.current = requestAnimationFrame(tick);
    };
    rafHandleRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafHandleRef.current !== null) cancelAnimationFrame(rafHandleRef.current);
    };
  }, [mode, reducedMotion]);

  return useCallback((node: HTMLDivElement | null) => {
    canvasNodeRef.current = node;
  }, []);
}
