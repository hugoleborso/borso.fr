import {
  closeSession,
  createSender,
  emulatePhone,
  openSession,
  FIRST_VISIBLE_SCRIPT,
  pause,
  PROBE_SIGNAL,
  READ_PAGE_SCRIPT,
  RESET_PROBE_SCRIPT,
} from './cdp-session';
import {
  interpolateDragPath,
  resolveDragEnd,
  judgeTouchDrag,
  parseDragEnds,
  isOverDestination,
  parseTouchDragArguments,
  TOUCH_DRAG_BINDING,
  type TouchDragOptions,
} from './touch-drag.core';
import { readReportedEvent, type RecordedInputEvent, type TapPoint } from './touch-tap.core';

const USAGE = [
  'usage: pnpm exec tsx scripts/browser/touch-drag.ts --from <target> (--to <target> | --by <dx>,<dy>)',
  '         [--steps 8]',
  '         [--page <url part>] [--port 9222] [--width 375] [--height 812]',
  '',
  'Drags with a real touch through CDP Input.dispatchTouchEvent, on the Chromium',
  'listening on --port (scripts/phone.sh passes its agent-browser session), at a',
  'phone viewport with touch emulation on: touchStart at the centre of the first',
  'visible --from match, --steps touchMove events, touchEnd at the centre of the',
  'first visible --to match, or --by CSS pixels away from where it started (a',
  'swipe, such as --by -120,0). A target is a CSS selector, or text=<name> for',
  'the innermost element whose aria-label or text is exactly <name>. Prints which events reached the page. Exits 1',
  'unless a touchstart reached --from, a touchmove and a touchend fired, no',
  'pointercancel said the browser took the gesture to pan, and, with --to, the',
  'touch lifted over --to. A --by swipe accepts a pointercancel: touch events',
  'still reach the page, so read the page back for whether it acted.',
  'Whether the page acted on the drag is yours to read back.',
  '',
].join('\n');

const PAGE_LEFT = 'the drag navigated away before the page could be read';
const TOUCH_STEP_MILLISECONDS = 60;
const SETTLE_MILLISECONDS = 300;
const TOUCH_RADIUS = 12;
const DESTINATION_GLOBAL = '__touchDragDestination';
const PAGE_EVENTS = [
  'pointerdown',
  'touchstart',
  'touchmove',
  'touchend',
  'pointerup',
  'pointercancel',
  'touchcancel',
];
const EVENTS_THAT_FOLLOW_A_REMOVED_TARGET = ['touchmove', 'touchend', 'touchcancel'];

function buildPreparationScript(options: TouchDragOptions): string {
  return `(() => {
    ${FIRST_VISIBLE_SCRIPT}
    const origin = firstVisible(${JSON.stringify(options.fromSelector)});
    const destination = ${
      options.offset === null ? `firstVisible(${JSON.stringify(options.toSelector)})` : 'null'
    };
    const centre = (element) => {
      if (element === undefined || element === null) return null;
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };
    if (origin === undefined || destination === undefined) {
      return { from: centre(origin), to: centre(destination) };
    }
    origin.scrollIntoView({ block: 'center' });
    window.${DESTINATION_GLOBAL} = destination;
    ${RESET_PROBE_SCRIPT}
    const reported = new WeakSet();
    const report = (event) => {
      if (reported.has(event)) return;
      reported.add(event);
      window.${TOUCH_DRAG_BINDING}(JSON.stringify({
        type: event.type,
        pointerType: event.pointerType ?? '',
        isOnTarget: event.target instanceof Node && origin.contains(event.target),
      }));
    };
    const listening = { capture: true, signal: ${PROBE_SIGNAL} };
    for (const type of ${JSON.stringify(PAGE_EVENTS)}) {
      document.addEventListener(type, report, listening);
    }
    for (const type of ${JSON.stringify(EVENTS_THAT_FOLLOW_A_REMOVED_TARGET)}) {
      origin.addEventListener(type, report, listening);
    }
    return { from: centre(origin), to: centre(destination) };
  })()`;
}

function buildIsOverDestinationScript(point: TapPoint): string {
  return `document
    .elementsFromPoint(${String(point.x)}, ${String(point.y)})
    .some((element) => window.${DESTINATION_GLOBAL}.contains(element))`;
}

function toTouchPoint(point: TapPoint) {
  return { ...point, radiusX: TOUCH_RADIUS, radiusY: TOUCH_RADIUS, force: 1 };
}

function describeMissingEnd(isFromMissing: boolean, options: TouchDragOptions): string {
  const selector = isFromMissing ? options.fromSelector : options.toSelector;
  return `no visible element matches ${selector}`;
}

async function didDragArriveAsTouch(options: TouchDragOptions): Promise<boolean> {
  const socket = await openSession(options);
  const send = createSender(socket);
  const reported: RecordedInputEvent[] = [];
  socket.addEventListener('message', (message) => {
    const event = readReportedEvent(String(message.data), TOUCH_DRAG_BINDING);
    if (event !== null) reported.push(event);
  });
  try {
    await send('Runtime.enable');
    await send('Runtime.addBinding', { name: TOUCH_DRAG_BINDING });
    await emulatePhone(send, options);
    const measured = parseDragEnds(
      await send('Runtime.evaluate', {
        expression: buildPreparationScript(options),
        returnByValue: true,
      }),
    );
    const ends = { from: measured.from, to: resolveDragEnd(measured, options.offset) };
    if (ends.from === null || ends.to === null) {
      throw new Error(describeMissingEnd(ends.from === null, options));
    }
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [toTouchPoint(ends.from)],
    });
    for (const point of interpolateDragPath(ends.from, ends.to, options.steps)) {
      await pause(TOUCH_STEP_MILLISECONDS);
      await send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [toTouchPoint(point)],
      });
    }
    await pause(TOUCH_STEP_MILLISECONDS);
    const isLiftOverDestination =
      options.offset !== null ||
      isOverDestination(
        await send('Runtime.evaluate', {
          expression: buildIsOverDestinationScript(ends.to),
          returnByValue: true,
        }),
      );
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await pause(SETTLE_MILLISECONDS);
    const page = await send('Runtime.evaluate', {
      expression: READ_PAGE_SCRIPT,
      returnByValue: true,
    }).catch(() => PAGE_LEFT);
    const verdict = judgeTouchDrag(reported, isLiftOverDestination, options.offset !== null);
    process.stdout.write(
      `${JSON.stringify(
        {
          from: { selector: options.fromSelector, point: ends.from },
          to: { selector: options.toSelector, offset: options.offset, point: ends.to },
          steps: options.steps,
          isLiftOverDestination,
          page,
          events: reported,
          verdict,
        },
        null,
        2,
      )}\n`,
    );
    return verdict.isRealDrag;
  } finally {
    await closeSession(socket);
  }
}

const options = parseTouchDragArguments(process.argv.slice(2));
if (options === null) {
  process.stderr.write(USAGE);
  process.exit(2);
}
const isRealDrag = await didDragArriveAsTouch(options).catch((error: unknown) => {
  process.stderr.write(`[touch-drag] ${error instanceof Error ? error.message : String(error)}\n`);
  return false;
});
process.exit(isRealDrag ? 0 : 1);
