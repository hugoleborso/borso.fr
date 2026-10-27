import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const ARGENT_BINARY = `${REPOSITORY_ROOT}/node_modules/.bin/argent`;
const PROXY_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'];
const LOOPBACK_HOSTS = 'localhost,127.0.0.1';
const DEFAULT_CDP_PORT = 9282;
const FRACTION_DIGITS = 4;
const SCROLL_FRACTION_DIGITS = 3;

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

function readCdpPort(): number {
  const configured = process.env.ARGENT_CDP_PORT;
  return configured === undefined ? DEFAULT_CDP_PORT : Number(configured);
}

export const CDP_PORT = readCdpPort();
const DEVICE_ID = `chromium-cdp-${String(CDP_PORT)}`;

function buildArgentEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    NO_PROXY: LOOPBACK_HOSTS,
    no_proxy: LOOPBACK_HOSTS,
  };
  for (const name of PROXY_VARIABLES) Reflect.deleteProperty(environment, name);
  return environment;
}

// @FollowsBlueprint adapter-external-service
export function runArgent(commandArguments: readonly string[]): string {
  return execFileSync(ARGENT_BINARY, ['run', ...commandArguments, '--udid', DEVICE_ID, '--json'], {
    env: buildArgentEnvironment(),
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  });
}

export function refreshArgentViewport(): void {
  runArgent(['describe']);
}

export function tapAt(point: ScreenPoint): void {
  runArgent([
    'gesture-tap',
    '--x',
    point.x.toFixed(FRACTION_DIGITS),
    '--y',
    point.y.toFixed(FRACTION_DIGITS),
  ]);
}

export function scrollAt(point: ScreenPoint, deltaY: number): void {
  runArgent([
    'gesture-scroll',
    '--x',
    point.x.toFixed(SCROLL_FRACTION_DIGITS),
    '--y',
    point.y.toFixed(SCROLL_FRACTION_DIGITS),
    '--deltaY',
    deltaY.toFixed(SCROLL_FRACTION_DIGITS),
  ]);
}

export function dragBetween(origin: ScreenPoint, destination: ScreenPoint): void {
  runArgent([
    'gesture-drag',
    '--fromX',
    origin.x.toFixed(FRACTION_DIGITS),
    '--fromY',
    origin.y.toFixed(FRACTION_DIGITS),
    '--toX',
    destination.x.toFixed(FRACTION_DIGITS),
    '--toY',
    destination.y.toFixed(FRACTION_DIGITS),
  ]);
}

export function typeText(text: string): void {
  runArgent(['keyboard', '--text', text]);
}

export function pressKey(key: string): void {
  runArgent(['keyboard', '--key', key]);
}
