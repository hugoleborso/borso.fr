import {
  type CdpReply,
  findPageTarget,
  judgeTouchTap,
  type PageTarget,
  parseCdpReply,
  parseTapPoint,
  parseTouchTapArguments,
  readReportedEvent,
  type RecordedInputEvent,
  TOUCH_TAP_BINDING,
  type TouchTapOptions,
} from './touch-tap.core';

const USAGE = [
  'usage: pnpm exec tsx scripts/browser/touch-tap.ts --selector <css> [--page <url part>]',
  '         [--port 9222] [--width 375] [--height 812]',
  '',
  'Taps the element with a real touch through CDP Input.dispatchTouchEvent, on the',
  'Chromium listening on --port (the one scripts/argent.sh starts), at a phone',
  'viewport with touch emulation on, and prints which events reached it.',
  'Exits 1 when the tap did not arrive as touch on the element.',
  '',
].join('\n');

const PAGE_LEFT = 'the tap navigated away before the page could be read';
const TOUCH_HOLD_MILLISECONDS = 60;
const SETTLE_MILLISECONDS = 300;
const TOUCH_RADIUS = 12;
const PHONE_SCALE_FACTOR = 3;
const PHONE_TOUCH_POINTS = 5;

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getPage(options: TouchTapOptions): Promise<PageTarget> {
  const response = await fetch(`http://127.0.0.1:${String(options.port)}/json/list`);
  const listing: unknown = await response.json();
  const page = findPageTarget(listing, options.pageUrlPart);
  if (page === null) {
    throw new Error(`no page on CDP ${String(options.port)} matches "${options.pageUrlPart}"`);
  }
  return page;
}

function openSession(page: PageTarget): Promise<WebSocket> {
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

function createSender(socket: WebSocket) {
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

function buildPreparationScript(selector: string): string {
  return `(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (target === null) return null;
    target.scrollIntoView({ block: 'center' });
    for (const type of ['pointerdown', 'touchstart', 'touchend', 'click']) {
      document.addEventListener(type, (event) => {
        window.${TOUCH_TAP_BINDING}(JSON.stringify({
          type,
          pointerType: event.pointerType ?? '',
          isOnTarget: event.target instanceof Node && target.contains(event.target),
        }));
      }, { capture: true });
    }
    const box = target.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  })()`;
}

const READ_PAGE_SCRIPT = `({
  innerWidth: window.innerWidth,
  maxTouchPoints: navigator.maxTouchPoints,
  isCoarsePointer: matchMedia('(pointer: coarse)').matches,
})`;

async function didTapArriveAsTouch(options: TouchTapOptions): Promise<boolean> {
  const socket = await openSession(await getPage(options));
  const send = createSender(socket);
  const reported: RecordedInputEvent[] = [];
  socket.addEventListener('message', (message) => {
    const event = readReportedEvent(String(message.data));
    if (event !== null) reported.push(event);
  });
  try {
    await send('Runtime.enable');
    await send('Runtime.addBinding', { name: TOUCH_TAP_BINDING });
    await send('Emulation.setDeviceMetricsOverride', {
      width: options.width,
      height: options.height,
      deviceScaleFactor: PHONE_SCALE_FACTOR,
      mobile: true,
    });
    await send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: PHONE_TOUCH_POINTS,
    });
    const point = parseTapPoint(
      await send('Runtime.evaluate', {
        expression: buildPreparationScript(options.selector),
        returnByValue: true,
      }),
    );
    if (point === null) throw new Error(`no element matches ${options.selector}`);
    const touchPoint = { ...point, radiusX: TOUCH_RADIUS, radiusY: TOUCH_RADIUS, force: 1 };
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint] });
    await pause(TOUCH_HOLD_MILLISECONDS);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pause(SETTLE_MILLISECONDS);
    const page = await send('Runtime.evaluate', {
      expression: READ_PAGE_SCRIPT,
      returnByValue: true,
    }).catch(() => PAGE_LEFT);
    const verdict = judgeTouchTap(reported);
    process.stdout.write(
      `${JSON.stringify({ selector: options.selector, point, page, events: reported, verdict }, null, 2)}\n`,
    );
    return verdict.isRealTouch;
  } finally {
    socket.close();
  }
}

const options = parseTouchTapArguments(process.argv.slice(2));
if (options === null) {
  process.stderr.write(USAGE);
  process.exit(2);
}
const isRealTouch = await didTapArriveAsTouch(options);
process.exit(isRealTouch ? 0 : 1);
