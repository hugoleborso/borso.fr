import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { runCommand } = vi.hoisted(() => ({ runCommand: vi.fn(() => '{}') }));

vi.mock('node:child_process', () => ({
  execFileSync: runCommand,
  default: { execFileSync: runCommand },
}));

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const PROXY_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];

async function loadAdapterAfresh(): Promise<typeof import('./argent-input.adapter')> {
  vi.resetModules();
  return import('./argent-input.adapter');
}

function readLastCall(): readonly unknown[] {
  const calls: readonly (readonly unknown[])[] = runCommand.mock.calls;
  return calls[calls.length - 1] ?? [];
}

function readLastArguments(): readonly unknown[] {
  const commandArguments: unknown = readLastCall()[1];
  return Array.isArray(commandArguments) ? commandArguments : [];
}

describe('argent input', () => {
  beforeEach(() => {
    runCommand.mockClear();
    vi.stubEnv('ARGENT_CDP_PORT', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('runs each gesture on the one device, as json, from the repository binary', async () => {
    const adapter = await loadAdapterAfresh();
    adapter.tapAt({ x: 0.5, y: 0.25 });
    expect(readLastCall()[0]).toBe(`${REPOSITORY_ROOT}/node_modules/.bin/argent`);
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
    expect(readLastCall()[2]).toMatchObject({
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      env: { NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' },
    });
  });

  it('removes every proxy variable from the environment argent runs in', async () => {
    for (const name of PROXY_VARIABLES) vi.stubEnv(name, 'http://proxy.invalid');
    const adapter = await loadAdapterAfresh();
    adapter.pressKey('Enter');
    const options: unknown = readLastCall()[2];
    const environment: unknown =
      typeof options === 'object' && options !== null ? Reflect.get(options, 'env') : undefined;
    expect(environment).toBeTypeOf('object');
    for (const name of PROXY_VARIABLES) {
      expect(Object.keys(Object(environment))).not.toContain(name);
    }
  });

  it('passes scroll, drag, typing and key presses through', async () => {
    const adapter = await loadAdapterAfresh();
    adapter.scrollAt({ x: 0.5, y: 0.45 }, 0.7);
    expect(readLastArguments().slice(1, 8)).toEqual([
      'gesture-scroll',
      '--x',
      '0.500',
      '--y',
      '0.450',
      '--deltaY',
      '0.700',
    ]);
    adapter.dragBetween({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 });
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
    adapter.typeText('Am');
    expect(readLastArguments().slice(1, 4)).toEqual(['keyboard', '--text', 'Am']);
    adapter.pressKey('Escape');
    expect(readLastArguments().slice(1, 4)).toEqual(['keyboard', '--key', 'Escape']);
    adapter.refreshArgentViewport();
    expect(readLastArguments()[1]).toBe('describe');
  });

  it('reads the DevTools port from the environment when it is set', async () => {
    vi.stubEnv('ARGENT_CDP_PORT', '9333');
    const adapter = await loadAdapterAfresh();
    expect(adapter.CDP_PORT).toBe(9333);
    adapter.typeText('x');
    expect(readLastArguments()).toContain('chromium-cdp-9333');
  });
});
