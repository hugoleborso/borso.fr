import {
  createSender,
  emulatePhone,
  openSession,
  pause,
  PROBE_SIGNAL,
  READ_PAGE_SCRIPT,
  RESET_PROBE_SCRIPT,
} from './cdp-session';
import {
  judgeTouchTap,
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
  'Chromium listening on --port (scripts/phone.sh passes its agent-browser session),',
  'at a phone viewport with touch emulation on, and prints which events reached it.',
  'Exits 1 when the tap did not arrive as touch on the element.',
  '',
].join('\n');

const PAGE_LEFT = 'the tap navigated away before the page could be read';
const TOUCH_HOLD_MILLISECONDS = 60;
const SETTLE_MILLISECONDS = 300;
const TOUCH_RADIUS = 12;

function buildPreparationScript(selector: string): string {
  return `(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((element) =>
      element.checkVisibility(),
    );
    if (target === undefined) return null;
    target.scrollIntoView({ block: 'center' });
    ${RESET_PROBE_SCRIPT}
    for (const type of ['pointerdown', 'touchstart', 'touchend', 'click']) {
      document.addEventListener(type, (event) => {
        window.${TOUCH_TAP_BINDING}(JSON.stringify({
          type,
          pointerType: event.pointerType ?? '',
          isOnTarget: event.target instanceof Node && target.contains(event.target),
        }));
      }, { capture: true, signal: ${PROBE_SIGNAL} });
    }
    const box = target.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  })()`;
}

async function didTapArriveAsTouch(options: TouchTapOptions): Promise<boolean> {
  const socket = await openSession(options);
  const send = createSender(socket);
  const reported: RecordedInputEvent[] = [];
  socket.addEventListener('message', (message) => {
    const event = readReportedEvent(String(message.data));
    if (event !== null) reported.push(event);
  });
  try {
    await send('Runtime.enable');
    await send('Runtime.addBinding', { name: TOUCH_TAP_BINDING });
    await emulatePhone(send, options);
    const point = parseTapPoint(
      await send('Runtime.evaluate', {
        expression: buildPreparationScript(options.selector),
        returnByValue: true,
      }),
    );
    if (point === null) throw new Error(`no visible element matches ${options.selector}`);
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
