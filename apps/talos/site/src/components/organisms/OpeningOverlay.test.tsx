import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { OpeningOverlay } from './OpeningOverlay';

function mountHeaderLogo(): HTMLImageElement {
  const logo = document.createElement('img');
  logo.setAttribute('data-opening-dock', '');
  logo.getBoundingClientRect = () => DOMRect.fromRect({ x: 16, y: 12, width: 30, height: 30 });
  document.body.append(logo);
  return logo;
}

const JSDOM_PREFIXED_ANIMATION_EVENTS = {
  animationStart: 'webkitAnimationStart',
  animationEnd: 'webkitAnimationEnd',
} as const;

function fireAnimation(
  kind: keyof typeof JSDOM_PREFIXED_ANIMATION_EVENTS,
  target: HTMLElement,
  animationName: string,
): void {
  const event = new Event(JSDOM_PREFIXED_ANIMATION_EVENTS[kind], { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  act(() => {
    target.dispatchEvent(event);
  });
}

describe('the opening overlay', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('shows the coin and the engraved name over the app', () => {
    render(<OpeningOverlay />);
    expect(screen.getByTestId('opening').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('TALOS')).toBeTruthy();
  });

  it('aims the coin at the header logo once the app is revealed, and hides that logo meanwhile', () => {
    const logo = mountHeaderLogo();
    render(<OpeningOverlay />);
    const coin = screen.getByTestId('opening-coin');
    expect(coin.style.getPropertyValue('--opening-dock-scale')).toBe('0');
    fireAnimation('animationStart', screen.getByTestId('opening'), 'opening-reveal');
    expect(coin.style.getPropertyValue('--opening-dock-x')).toBe(
      `${String(31 - innerWidth / 2)}px`,
    );
    expect(coin.style.getPropertyValue('--opening-dock-y')).toBe(
      `${String(27 - innerHeight * 0.42)}px`,
    );
    expect(coin.style.getPropertyValue('--opening-dock-scale')).toBe('0.2');
    expect(logo.style.visibility).toBe('hidden');
  });

  it('aims again when the dock starts, for a header that arrived late', () => {
    render(<OpeningOverlay />);
    const logo = mountHeaderLogo();
    fireAnimation('animationStart', screen.getByTestId('opening'), 'opening-dock');
    expect(screen.getByTestId('opening-coin').style.getPropertyValue('--opening-dock-scale')).toBe(
      '0.2',
    );
    expect(logo.style.visibility).toBe('hidden');
  });

  it('leaves the coin alone when another animation starts', () => {
    const logo = mountHeaderLogo();
    render(<OpeningOverlay />);
    fireAnimation('animationStart', screen.getByTestId('opening'), 'opening-halo');
    expect(screen.getByTestId('opening-coin').style.getPropertyValue('--opening-dock-scale')).toBe(
      '0',
    );
    expect(logo.style.visibility).toBe('');
  });

  it('goes away when the coin has landed, and gives the header its logo back', () => {
    const logo = mountHeaderLogo();
    render(<OpeningOverlay />);
    const overlay = screen.getByTestId('opening');
    fireAnimation('animationStart', overlay, 'opening-reveal');
    fireAnimation('animationEnd', overlay, 'opening-word');
    expect(screen.queryByTestId('opening')).not.toBeNull();
    fireAnimation('animationEnd', overlay, 'opening-dock');
    expect(screen.queryByTestId('opening')).toBeNull();
    expect(logo.style.visibility).toBe('');
  });

  it('keeps opacity, filters and blending off the 3D coin, since each one flattens it and mirrors the back', () => {
    render(<OpeningOverlay />);
    const coin = screen.getByTestId('opening-coin');
    const coinLayers = [coin, ...coin.querySelectorAll('i')];
    expect(coinLayers).toHaveLength(17);
    for (const layer of coinLayers) {
      expect(layer.className).not.toMatch(/opacity|blur|filter|blend|brightness/);
      expect(layer.style.opacity).toBe('');
      expect(layer.style.filter).toBe('');
      expect(layer.style.mixBlendMode).toBe('');
    }
  });

  it('goes away at the first tap, taking the click so it never reaches the app beneath', () => {
    render(<OpeningOverlay />);
    act(() => {
      fireEvent.click(screen.getByTestId('opening'));
    });
    expect(screen.queryByTestId('opening')).toBeNull();
  });
});
