import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SpinningCoin } from './SpinningCoin';

const TOKENS = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../styles/tokens.css'),
  'utf8',
);
const FLATTENING_PROPERTIES = /\b(opacity|filter|mix-blend-mode)\s*:/;

function readFirstGroup(pattern: RegExp, missing: string): string {
  const group = pattern.exec(TOKENS)?.[1];
  if (group === undefined) throw new Error(`tokens.css declares no ${missing}`);
  return group;
}

function readKeyframes(name: string): string {
  return readFirstGroup(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`), name);
}

function readAnimationNames(token: string): string[] {
  return readFirstGroup(new RegExp(`--${token}:([^;]+);`), token).match(/opening-[a-z-]+/g) ?? [];
}

describe('the spinning coin', () => {
  afterEach(() => {
    cleanup();
  });

  it('animates its 3D element with keyframes that touch neither opacity, filters nor blending, which would flatten it and mirror the back', () => {
    const names = readAnimationNames('animate-opening-coin');
    expect(names).toEqual(['opening-spin-in', 'opening-dock']);
    for (const name of names) {
      expect(readKeyframes(name)).not.toMatch(FLATTENING_PROPERTIES);
    }
  });

  it('carries the 3D context on one element, its layers being flat leaves', () => {
    render(<SpinningCoin dockX={0} dockY={0} dockScale={0} />);
    const coin = screen.getByTestId('opening-coin');
    const layers = [...coin.children];
    expect(layers).toHaveLength(16);
    expect(coin.className).toContain('transform-3d');
    for (const layer of layers) {
      expect(layer.children).toHaveLength(0);
      expect(layer.className).not.toContain('transform-3d');
    }
  });

  it('carries the dock move as custom properties the dock keyframes read', () => {
    render(<SpinningCoin dockX={-164} dockY={-327.5} dockScale={0.2} />);
    const coin = screen.getByTestId('opening-coin');
    expect(coin.style.getPropertyValue('--opening-dock-x')).toBe('-164px');
    expect(coin.style.getPropertyValue('--opening-dock-y')).toBe('-327.5px');
    expect(coin.style.getPropertyValue('--opening-dock-scale')).toBe('0.2');
    expect(readKeyframes('opening-dock')).toContain('var(--opening-dock-x)');
  });
});
