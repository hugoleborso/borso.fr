import { type RefObject, useCallback, useEffect, useRef } from 'react';
import {
  type AnimationMode,
  type CanvasTransform,
  isTransformAnimated,
  selectCanvasTransform,
} from './animation.core';

const DRIFT_PHASE_PER_RECTANGLE = 0.61;
const DRIFT_TIME_SCALE_X = 0.7;
const DRIFT_TIME_SCALE_Y = 0.5;
const DRIFT_TIME_SCALE_ROTATION = 0.3;
const DRIFT_PHASE_Y_MULTIPLIER = 1.3;
const DRIFT_TRANSLATION_AMPLITUDE_PX = 4;
const DRIFT_ROTATION_AMPLITUDE_DEG = 0.3;

const BREATHE_PHASE_PER_RECTANGLE = 0.31;
const BREATHE_TIME_SCALE_SCALE = 0.9;
const BREATHE_TIME_SCALE_DRIFT = 0.4;
const BREATHE_SCALE_AMPLITUDE = 0.04;
const BREATHE_DRIFT_AMPLITUDE_PX = 1.5;

const MILLISECONDS_PER_SECOND = 1000;
const NO_ANIMATION_FRAME_HANDLE = 0;
const RECTANGLE_SELECTOR = '.rect';

type CanvasNodeRef = RefObject<HTMLDivElement | null>;
type TransformApplier = (canvasNode: HTMLDivElement | null, secondsElapsed: number) => void;

function clearTransforms(canvasNode: HTMLDivElement | null) {
  canvasNode?.querySelectorAll<HTMLElement>(RECTANGLE_SELECTOR).forEach((rectangleElement) => {
    rectangleElement.style.transform = '';
  });
}

function applyDriftTransforms(canvasNode: HTMLDivElement | null, secondsElapsed: number) {
  canvasNode
    ?.querySelectorAll<HTMLElement>(RECTANGLE_SELECTOR)
    .forEach((rectangleElement, rectangleIndex) => {
      const phase = rectangleIndex * DRIFT_PHASE_PER_RECTANGLE;
      const offsetX =
        Math.sin(secondsElapsed * DRIFT_TIME_SCALE_X + phase) * DRIFT_TRANSLATION_AMPLITUDE_PX;
      const offsetY =
        Math.cos(secondsElapsed * DRIFT_TIME_SCALE_Y + phase * DRIFT_PHASE_Y_MULTIPLIER) *
        DRIFT_TRANSLATION_AMPLITUDE_PX;
      const rotationDegrees =
        Math.sin(secondsElapsed * DRIFT_TIME_SCALE_ROTATION + phase) * DRIFT_ROTATION_AMPLITUDE_DEG;
      rectangleElement.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotationDegrees}deg)`;
    });
}

function applyBreatheTransforms(canvasNode: HTMLDivElement | null, secondsElapsed: number) {
  canvasNode
    ?.querySelectorAll<HTMLElement>(RECTANGLE_SELECTOR)
    .forEach((rectangleElement, rectangleIndex) => {
      const phase = rectangleIndex * BREATHE_PHASE_PER_RECTANGLE;
      const scaleFactor =
        1 + Math.sin(secondsElapsed * BREATHE_TIME_SCALE_SCALE + phase) * BREATHE_SCALE_AMPLITUDE;
      const offsetX =
        Math.cos(secondsElapsed * BREATHE_TIME_SCALE_DRIFT + phase) * BREATHE_DRIFT_AMPLITUDE_PX;
      rectangleElement.style.transform = `translate(${offsetX}px, 0) scale(${scaleFactor})`;
    });
}

const APPLIER_BY_TRANSFORM: Readonly<Record<CanvasTransform, TransformApplier>> = {
  none: clearTransforms,
  drift: applyDriftTransforms,
  breathe: applyBreatheTransforms,
};

type StopAnimating = () => void;

const NO_SECONDS_ELAPSED = 0;

function stopNothing(): void {
  return undefined;
}

function settleCanvas(canvasNodeRef: CanvasNodeRef, transform: CanvasTransform): StopAnimating {
  APPLIER_BY_TRANSFORM[transform](canvasNodeRef.current, NO_SECONDS_ELAPSED);
  return stopNothing;
}

function animateCanvas(canvasNodeRef: CanvasNodeRef, transform: CanvasTransform): StopAnimating {
  const applyTransforms = APPLIER_BY_TRANSFORM[transform];
  const startTimestamp = performance.now();
  const frame = { handle: NO_ANIMATION_FRAME_HANDLE };
  const tick = (now: number) => {
    applyTransforms(canvasNodeRef.current, (now - startTimestamp) / MILLISECONDS_PER_SECOND);
    frame.handle = requestAnimationFrame(tick);
  };
  frame.handle = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame.handle);
  };
}

const START_BY_ANIMATED: Readonly<
  Record<`${boolean}`, (canvasNodeRef: CanvasNodeRef, transform: CanvasTransform) => StopAnimating>
> = {
  true: animateCanvas,
  false: settleCanvas,
};

/**
 * Returns the `ref` callback for the canvas. The animation loop is a
 * `requestAnimationFrame` cycle that owns its own lifecycle, which is the one
 * case standard 07 keeps an effect for.
 */
export function useAnimation(
  mode: AnimationMode,
  isReducedMotion: boolean,
): (node: HTMLDivElement | null) => void {
  const canvasNodeRef = useRef<HTMLDivElement | null>(null);
  const transform = selectCanvasTransform(mode, isReducedMotion);

  // eslint-disable-next-line borso/no-use-effect -- synchronises the canvas with the browser's requestAnimationFrame loop, which owns its own lifecycle
  useEffect(
    () => START_BY_ANIMATED[`${isTransformAnimated(transform)}`](canvasNodeRef, transform),
    [transform],
  );

  return useCallback((node: HTMLDivElement | null) => {
    canvasNodeRef.current = node;
  }, []);
}
