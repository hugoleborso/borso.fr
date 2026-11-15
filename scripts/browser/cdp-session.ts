import { type CdpReply, findPageTarget, type PageTarget, parseCdpReply } from './touch-tap.core';

const PHONE_SCALE_FACTOR = 3;
const PHONE_TOUCH_POINTS = 5;

export interface CdpTarget {
  readonly port: number;
  readonly pageUrlPart: string;
}

export interface PhoneViewport {
  readonly width: number;
  readonly height: number;
}

export type CdpSend = (method: string, params?: object) => Promise<unknown>;

export function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getPage(target: CdpTarget): Promise<PageTarget> {
  const response = await fetch(`http://127.0.0.1:${String(target.port)}/json/list`);
  const listing: unknown = await response.json();
  const page = findPageTarget(listing, target.pageUrlPart);
  if (page === null) {
    throw new Error(`no page on CDP ${String(target.port)} matches "${target.pageUrlPart}"`);
  }
  return page;
}

export async function openSession(target: CdpTarget): Promise<WebSocket> {
  const page = await getPage(target);
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve(socket);
    });
    socket.addEventListener('error', () => {
      reject(new Error(`could not open ${page.webSocketDebuggerUrl}`));
    });
  });
}

export function createSender(socket: WebSocket): CdpSend {
  let nextId = 0;
  const waiting = new Map<number, (reply: CdpReply) => void>();
  socket.addEventListener('message', (message) => {
    const reply = parseCdpReply(String(message.data));
    if (reply.id !== undefined) waiting.get(reply.id)?.(reply);
  });
  return async function send(method: string, params: object = {}): Promise<unknown> {
    nextId += 1;
    const id = nextId;
    const reply = await new Promise<CdpReply>((resolve) => {
      waiting.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
    if (reply.error !== undefined) throw new Error(`${method}: ${reply.error.message}`);
    return reply.result?.result?.value;
  };
}

export async function emulatePhone(send: CdpSend, viewport: PhoneViewport): Promise<void> {
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: PHONE_SCALE_FACTOR,
    mobile: true,
  });
  await send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: PHONE_TOUCH_POINTS,
  });
}

const PROBE_GLOBAL = '__touchProbe';

export const RESET_PROBE_SCRIPT = `window.${PROBE_GLOBAL}?.abort();
    window.${PROBE_GLOBAL} = new AbortController();`;

export const PROBE_SIGNAL = `window.${PROBE_GLOBAL}.signal`;

export const READ_PAGE_SCRIPT = `({
  innerWidth: window.innerWidth,
  maxTouchPoints: navigator.maxTouchPoints,
  isCoarsePointer: matchMedia('(pointer: coarse)').matches,
})`;
