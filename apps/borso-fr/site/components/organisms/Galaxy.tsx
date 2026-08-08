// Galaxy — react-bits Galaxy component, ported as TSX for borso.fr.
//
//   SPDX-License-Identifier: MIT
//   Source:    https://github.com/DavidHDev/react-bits
//             (components/Backgrounds/Galaxy/Galaxy.jsx)
//   Copyright (c) 2024 David Haz
//
// Do not strip this header — it is the license compliance surface for the
// react-bits component (see docs/adr/0003-react-bits-galaxy-as-react-component.md).
// The GLSL lives in `galaxy-shaders.ts`, preserved verbatim from upstream; only
// the harness was retyped.

import { Color, Mesh, type OGLRenderingContext, Program, Renderer, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import { easeTowards, selectStarClock } from './galaxy-clock.core';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './galaxy-shaders';

const POINTER_INACTIVE = 0;
const POINTER_ACTIVE = 1;
const CENTRE = 0.5;

interface Uniform<Value> {
  value: Value;
}

interface GalaxyUniforms {
  uTime: Uniform<number>;
  uResolution: Uniform<Color>;
  uFocal: Uniform<Float32Array>;
  uRotation: Uniform<Float32Array>;
  uStarSpeed: Uniform<number>;
  uDensity: Uniform<number>;
  uHueShift: Uniform<number>;
  uSpeed: Uniform<number>;
  uMouse: Uniform<Float32Array>;
  uGlowIntensity: Uniform<number>;
  uSaturation: Uniform<number>;
  uMouseRepulsion: Uniform<boolean>;
  uTwinkleIntensity: Uniform<number>;
  uRotationSpeed: Uniform<number>;
  uRepulsionStrength: Uniform<number>;
  uMouseActiveFactor: Uniform<number>;
  uAutoCenterRepulsion: Uniform<number>;
  uTransparent: Uniform<boolean>;
}

function enableAlphaBlending(renderingContext: OGLRenderingContext): void {
  renderingContext.enable(renderingContext.BLEND);
  renderingContext.blendFunc(renderingContext.SRC_ALPHA, renderingContext.ONE_MINUS_SRC_ALPHA);
  renderingContext.clearColor(0, 0, 0, 0);
}

function paintOpaqueBackground(renderingContext: OGLRenderingContext): void {
  renderingContext.clearColor(0, 0, 0, 1);
}

const CONFIGURE_CANVAS: Readonly<
  Record<`${boolean}`, (renderingContext: OGLRenderingContext) => void>
> = {
  true: enableAlphaBlending,
  false: paintOpaqueBackground,
};

type DetachPointer = () => void;

interface PointerHandlers {
  onPointerMove: (event: PointerEvent) => void;
  onPointerLeave: () => void;
}

function attachPointer(container: HTMLDivElement, handlers: PointerHandlers): DetachPointer {
  // pointermove instead of mousemove so finger drags on touch devices also
  // drive the warp — the upstream component listened for mouse events only,
  // which silently dropped the effect on mobile.
  container.addEventListener('pointermove', handlers.onPointerMove);
  container.addEventListener('pointerleave', handlers.onPointerLeave);
  return () => {
    container.removeEventListener('pointermove', handlers.onPointerMove);
    container.removeEventListener('pointerleave', handlers.onPointerLeave);
  };
}

function detachNothing(): void {
  return undefined;
}

function ignorePointer(): DetachPointer {
  return detachNothing;
}

const ATTACH_POINTER: Readonly<
  Record<`${boolean}`, (container: HTMLDivElement, handlers: PointerHandlers) => DetachPointer>
> = {
  true: attachPointer,
  false: ignorePointer,
};

interface GalaxyProps {
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  isAnimationPaused?: boolean;
  speed?: number;
  isMouseInteractive?: boolean;
  glowIntensity?: number;
  saturation?: number;
  isMouseRepelling?: boolean;
  repulsionStrength?: number;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  autoCenterRepulsion?: number;
  isTransparent?: boolean;
}

export function Galaxy({
  focal = [CENTRE, CENTRE],
  rotation = [1.0, 0.0],
  starSpeed = 0.5,
  density = 1,
  hueShift = 140,
  isAnimationPaused = false,
  speed = 1.0,
  isMouseInteractive = true,
  glowIntensity = 0.3,
  saturation = 0.0,
  isMouseRepelling = true,
  repulsionStrength = 2,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  autoCenterRepulsion = 0,
  isTransparent = true,
}: GalaxyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetPointer = useRef({ x: CENTRE, y: CENTRE });
  const smoothPointer = useRef({ x: CENTRE, y: CENTRE });
  const targetPointerActivity = useRef(POINTER_INACTIVE);
  const smoothPointerActivity = useRef(POINTER_INACTIVE);

  // eslint-disable-next-line borso/no-use-effect -- synchronises React with the ogl WebGL renderer, which owns its own canvas, resize listener and animation frame lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) throw new Error('The Galaxy container was never mounted');

    const renderer = new Renderer({ alpha: isTransparent, premultipliedAlpha: false });
    const renderingContext = renderer.gl;
    CONFIGURE_CANVAS[`${isTransparent}`](renderingContext);

    const geometry = new Triangle(renderingContext);
    const uniforms: GalaxyUniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new Color(
          renderingContext.canvas.width,
          renderingContext.canvas.height,
          renderingContext.canvas.width / renderingContext.canvas.height,
        ),
      },
      uFocal: { value: new Float32Array(focal) },
      uRotation: { value: new Float32Array(rotation) },
      uStarSpeed: { value: starSpeed },
      uDensity: { value: density },
      uHueShift: { value: hueShift },
      uSpeed: { value: speed },
      uMouse: { value: new Float32Array([smoothPointer.current.x, smoothPointer.current.y]) },
      uGlowIntensity: { value: glowIntensity },
      uSaturation: { value: saturation },
      uMouseRepulsion: { value: isMouseRepelling },
      uTwinkleIntensity: { value: twinkleIntensity },
      uRotationSpeed: { value: rotationSpeed },
      uRepulsionStrength: { value: repulsionStrength },
      uMouseActiveFactor: { value: POINTER_INACTIVE },
      uAutoCenterRepulsion: { value: autoCenterRepulsion },
      uTransparent: { value: isTransparent },
    };
    const program = new Program(renderingContext, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms,
    });

    const resize = () => {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      uniforms.uResolution.value = new Color(
        renderingContext.canvas.width,
        renderingContext.canvas.height,
        renderingContext.canvas.width / renderingContext.canvas.height,
      );
    };
    window.addEventListener('resize', resize, false);
    resize();

    const mesh = new Mesh(renderingContext, { geometry, program });
    const frame = { handle: 0 };

    const update = (timestamp: number) => {
      frame.handle = requestAnimationFrame(update);
      const clock = selectStarClock(isAnimationPaused, timestamp, starSpeed, {
        elapsedSeconds: uniforms.uTime.value,
        travelledDistance: uniforms.uStarSpeed.value,
      });
      uniforms.uTime.value = clock.elapsedSeconds;
      uniforms.uStarSpeed.value = clock.travelledDistance;

      smoothPointer.current.x = easeTowards(smoothPointer.current.x, targetPointer.current.x);
      smoothPointer.current.y = easeTowards(smoothPointer.current.y, targetPointer.current.y);
      smoothPointerActivity.current = easeTowards(
        smoothPointerActivity.current,
        targetPointerActivity.current,
      );

      uniforms.uMouse.value[0] = smoothPointer.current.x;
      uniforms.uMouse.value[1] = smoothPointer.current.y;
      uniforms.uMouseActiveFactor.value = smoothPointerActivity.current;

      renderer.render({ scene: mesh });
    };
    frame.handle = requestAnimationFrame(update);
    container.appendChild(renderingContext.canvas);

    const detachPointer = ATTACH_POINTER[`${isMouseInteractive}`](container, {
      onPointerMove: (event) => {
        const bounds = container.getBoundingClientRect();
        targetPointer.current = {
          x: (event.clientX - bounds.left) / bounds.width,
          y: 1.0 - (event.clientY - bounds.top) / bounds.height,
        };
        targetPointerActivity.current = POINTER_ACTIVE;
      },
      onPointerLeave: () => {
        targetPointerActivity.current = POINTER_INACTIVE;
      },
    });

    return () => {
      cancelAnimationFrame(frame.handle);
      window.removeEventListener('resize', resize);
      detachPointer();
      container.removeChild(renderingContext.canvas);
      renderingContext.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [
    focal,
    rotation,
    starSpeed,
    density,
    hueShift,
    isAnimationPaused,
    speed,
    isMouseInteractive,
    glowIntensity,
    saturation,
    isMouseRepelling,
    twinkleIntensity,
    rotationSpeed,
    repulsionStrength,
    autoCenterRepulsion,
    isTransparent,
  ]);

  return <div ref={containerRef} className="galaxy-container" />;
}
