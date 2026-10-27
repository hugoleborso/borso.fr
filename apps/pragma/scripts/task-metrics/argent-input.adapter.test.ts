import { execFileSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dragBetween,
  pressKey,
  refreshArgentViewport,
  scrollAt,
  tapAt,
  typeText,
} from './argent-input.adapter';

vi.mock('node:child_process', () => {
  const execFileSync = vi.fn(() => '{}');
  return { execFileSync, default: { execFileSync } };
});

function readLastArguments(): readonly string[] {
  const calls = vi.mocked(execFileSync).mock.calls;
  return calls[calls.length - 1]?.[1] ?? [];
}

describe('argent input', () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockClear();
  });

  it('runs each gesture on the one device, as json, with the proxy removed', () => {
    tapAt({ x: 0.5, y: 0.25 });
    expect(readLastArguments()).toEqual([
      'run',
      'gesture-tap',
      '--x',
      '0.5000',
      '--y',
      '0.2500',
      '--udid',
      'chromium-cdp-9282',
      '--json',
    ]);
    const options = vi.mocked(execFileSync).mock.calls[0]?.[2];
    expect(options).toMatchObject({ encoding: 'utf8', env: { NO_PROXY: 'localhost,127.0.0.1' } });
  });

  it('passes scroll, drag, typing and key presses through', () => {
    scrollAt({ x: 0.5, y: 0.45 }, 0.7);
    expect(readLastArguments().slice(1, 8)).toEqual([
      'gesture-scroll',
      '--x',
      '0.500',
      '--y',
      '0.450',
      '--deltaY',
      '0.700',
    ]);
    dragBetween({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 });
    expect(readLastArguments().slice(1, 10)).toEqual([
      'gesture-drag',
      '--fromX',
      '0.1000',
      '--fromY',
      '0.2000',
      '--toX',
      '0.3000',
      '--toY',
      '0.4000',
    ]);
    typeText('Am');
    expect(readLastArguments().slice(1, 4)).toEqual(['keyboard', '--text', 'Am']);
    pressKey('Escape');
    expect(readLastArguments().slice(1, 4)).toEqual(['keyboard', '--key', 'Escape']);
    refreshArgentViewport();
    expect(readLastArguments()[1]).toBe('describe');
  });

  it('reads the DevTools port from the environment when it is set', async () => {
    vi.stubEnv('ARGENT_CDP_PORT', '9333');
    vi.resetModules();
    const reloaded = await import('./argent-input.adapter');
    expect(reloaded.CDP_PORT).toBe(9333);
    vi.unstubAllEnvs();
  });
});
