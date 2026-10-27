// Drives the argent Chromium as an installed 390x844 phone app.
// Real touch: every tap and scroll goes through the argent CLI (gesture-tap, gesture-scroll).
// The raw CDP socket below only sets the emulation (viewport, standalone, safe-area insets)
// and reads the page (positions, URL, counts). It never clicks.
import { execFileSync } from 'node:child_process';

export const CDP_PORT = Number(process.env.ARGENT_CDP_PORT ?? 9282);
export const UDID = `chromium-cdp-${CDP_PORT}`;
const REPOSITORY_ROOT = new URL('../../../../../../', import.meta.url).pathname;
const ARGENT = `${REPOSITORY_ROOT}node_modules/.bin/argent`;
export const PHONE = {
  width: 390,
  height: 844,
  dpr: 3,
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
};
export const BOTTOM_THIRD_FROM = 2 / 3;
const STANDALONE = `(() => { const o = window.matchMedia.bind(window); window.matchMedia = (q) => { const r = o(q); if (!/display-mode:\\s*standalone/.test(q)) return r; return ({ matches: true, media: q, onchange: null, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return false; } }); }; })();`;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function argent(args) {
  const env = { ...process.env, NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' };
  for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) delete env[k];
  return execFileSync(ARGENT, ['run', ...args, '--udid', UDID, '--json'], {
    env,
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  });
}

export class Cdp {
  static async connect() {
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    const cdp = new Cdp();
    cdp.ws = new WebSocket(page.webSocketDebuggerUrl);
    cdp.id = 0;
    cdp.pending = new Map();
    cdp.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && cdp.pending.has(d.id)) {
        const { res, rej } = cdp.pending.get(d.id);
        cdp.pending.delete(d.id);
        d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result);
      }
    };
    await new Promise((r, j) => {
      cdp.ws.onopen = r;
      cdp.ws.onerror = j;
    });
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  async eval(fnSource, arg) {
    const expression = `(${fnSource})(${JSON.stringify(arg ?? null)})`;
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}

export async function emulatePhone(cdp) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: PHONE.width,
    height: PHONE.height,
    deviceScaleFactor: PHONE.dpr,
    mobile: true,
  });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: PHONE.insets });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: STANDALONE });
  refreshArgentViewport();
}

// argent caches innerWidth/innerHeight when it connects and maps [0,1] taps through it;
// describe re-reads it, so call it after every emulation change.
export function refreshArgentViewport() {
  argent(['describe']);
}
let argentViewport = '';
async function syncArgent(cdp) {
  const vp = await cdp.eval(`() => innerWidth + 'x' + innerHeight`);
  if (vp !== argentViewport) {
    refreshArgentViewport();
    argentViewport = vp;
  }
}

export async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await settle(cdp, 1200);
}

export async function settle(cdp, ms = 700) {
  await sleep(ms);
  for (let i = 0; i < 20; i++) {
    const ready = await cdp
      .eval(
        `() => document.readyState === 'complete' && !document.querySelector('[aria-busy="true"]')`,
      )
      .catch(() => false);
    if (ready) return;
    await sleep(250);
  }
}

// In-page: find an element from a spec, describe its position and its scroll container.
const FIND = `(spec) => {
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const nameOf = (e) => norm(e.getAttribute('aria-label') || e.innerText || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || e.value || '');
  const shown = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const dlg = [...document.querySelectorAll('dialog[open]')].pop();
  let root = document;
  if (spec.scope === 'dialog') root = dlg || document;
  else if (spec.scope && spec.scope !== 'page') root = document.querySelector(spec.scope) || document;
  else if (dlg && spec.scope !== 'page') root = dlg;
  if (spec.within) { const wre = new RegExp(spec.within.text, 'i'); const box = [...root.querySelectorAll(spec.within.css)].filter(shown).find((e) => wre.test(norm(e.innerText))); if (!box) return null; root = box; }
  const sel = spec.css || 'button, a, [role=button], [role=tab], [role=option], [role=menuitem], input, select, textarea, summary, label, li';
  const re = spec.text ? new RegExp(spec.text, 'i') : null;
  let list = [...root.querySelectorAll(sel)].filter(shown);
  if (re) list = list.filter((e) => re.test(nameOf(e)));
  if (spec.exact) list = list.filter((e) => nameOf(e).toLowerCase() === spec.exact.toLowerCase());
  const el = list[spec.index ?? 0];
  if (!el) return null;
  el.setAttribute('data-tm-target', String(Date.now()));
  let sc = el.parentElement; while (sc && sc !== document.body) { const s = getComputedStyle(sc); if (/(auto|scroll)/.test(s.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break; sc = sc.parentElement; }
  if (sc === document.body) sc = null;
  const r = el.getBoundingClientRect();
  const vv = window.visualViewport; const VT = vv.offsetTop, VB = vv.offsetTop + vv.height, VL = vv.offsetLeft, VR = vv.offsetLeft + vv.width;
  let vis = { top: VT, bottom: VB };
  if (sc) { const c = sc.getBoundingClientRect(); vis = { top: Math.max(VT, c.top), bottom: Math.min(VB, c.bottom) }; }
  const nav = [...document.querySelectorAll('nav')].find((n) => { const s = getComputedStyle(n); const nr = n.getBoundingClientRect(); return s.position === 'fixed' && nr.bottom >= innerHeight - 2 && nr.height < innerHeight / 3; });
  const navTop = nav && !el.closest('nav') && !dlg ? nav.getBoundingClientRect().top : VB;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = cy >= 0 && cy <= innerHeight && cx >= 0 && cx <= innerWidth ? document.elementFromPoint(cx, cy) : null;
  const hittable = !!hit && (hit === el || el.contains(hit) || hit.contains(el) || (el.tagName === 'INPUT' && hit.tagName === 'LABEL'));
  return { name: nameOf(el).slice(0, 80), tag: el.tagName.toLowerCase(), type: el.type || null, rect: [r.left, r.top, r.width, r.height].map(Math.round), cx, cy,
    vh: innerHeight, vw: innerWidth, screenH: vv.height, screenTop: VT, screenLeft: VL, screenW: vv.width, container: sc ? { rect: (() => { const c = sc.getBoundingClientRect(); return [c.left, c.top, c.width, c.height].map(Math.round); })(), scrollTop: sc.scrollTop } : null,
    visTop: vis.top, visBottom: Math.min(vis.bottom, navTop), hittable,
    inView: cy >= vis.top && cy <= Math.min(vis.bottom, navTop) && cx >= VL && cx <= VR && hittable };
}`;

export class Walk {
  constructor(cdp, task) {
    this.cdp = cdp;
    this.task = task;
    this.steps = [];
    this.taps = 0;
    this.scrolls = 0;
    this.texts = 0;
    this.screens = [];
    this.notes = [];
  }
  async where() {
    return this.cdp.eval(
      `() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); const h = d ? (d.getAttribute('aria-label') || (d.querySelector('h1,h2,h3')||{}).textContent || 'dialog') : null; return { path: location.pathname, overlay: h ? h.replace(/\\s+/g,' ').trim().slice(0,60) : null }; }`,
    );
  }
  async markScreen() {
    const w = await this.where();
    const key = w.overlay ? `${w.path} + [${w.overlay}]` : w.path;
    if (this.screens[this.screens.length - 1] !== key) this.screens.push(key);
    return w;
  }
  async find(spec) {
    return this.cdp.eval(FIND, spec);
  }
  async waitFor(spec, ms = 6000) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const f = await this.find(spec);
      if (f) return f;
      await sleep(250);
    }
    throw new Error(
      `[${this.task}] not found: ${JSON.stringify(spec)} on ${JSON.stringify(await this.where())}`,
    );
  }
  // Scroll with real wheel gestures until the target is in view. Each gesture is one "scroll".
  async bringIntoView(spec) {
    let f = await this.waitFor(spec);
    const first = f;
    let used = 0;
    while (!f.inView && used < 25) {
      const c = f.container?.rect;
      const px = c ? (c[0] + c[2] / 2 - f.screenLeft) / f.vw : (f.screenW * 0.5) / f.vw;
      const py = c
        ? ((f.visTop + f.visBottom) / 2 - f.screenTop) / f.vh
        : (f.screenH * 0.45) / f.vh;
      const target = (f.visTop + f.visBottom) / 2;
      let delta = (f.cy - target) / f.screenH;
      if (!f.hittable && Math.abs(delta) < 0.05) delta = 0.15;
      delta = Math.max(-0.7, Math.min(0.7, delta));
      await syncArgent(this.cdp);
      argent([
        'gesture-scroll',
        '--x',
        px.toFixed(3),
        '--y',
        py.toFixed(3),
        '--deltaY',
        delta.toFixed(3),
      ]);
      used++;
      this.scrolls++;
      await sleep(450);
      f = await this.waitFor(spec);
    }
    return { first, now: f, scrollsUsed: used };
  }
  async tap(label, spec, opts = {}) {
    await this.markScreen();
    const { first, now, scrollsUsed } = await this.bringIntoView(spec);
    if (!now.inView) throw new Error(`[${this.task}] could not bring into view: ${label}`);
    await syncArgent(this.cdp);
    // CDP input coordinates are window (visual viewport) pixels; argent scales [0,1] by innerWidth/innerHeight.
    argent([
      'gesture-tap',
      '--x',
      ((now.cx - now.screenLeft) / now.vw).toFixed(4),
      '--y',
      ((now.cy - now.screenTop) / now.vh).toFixed(4),
    ]);
    this.taps++;
    const yFrac = (first.cy - first.screenTop) / first.screenH;
    const step = {
      n: this.taps,
      kind: 'tap',
      label,
      target: first.name,
      tag: first.tag,
      primary: !!opts.primary,
      screen: this.screens[this.screens.length - 1],
      visibleOnArrival: first.inView,
      scrollsBefore: scrollsUsed,
      yFractionOnArrival: Number(yFrac.toFixed(3)),
      bottomThirdOnArrival: first.inView && yFrac >= BOTTOM_THIRD_FROM,
      yFractionWhenTapped: Number(((now.cy - now.screenTop) / now.screenH).toFixed(3)),
      box: first.rect,
    };
    this.steps.push(step);
    if (now.tag === 'input' || now.tag === 'textarea') {
      await sleep(250);
      const focused = await this.cdp.eval(
        `() => { const a = document.activeElement; return a ? (a.id || a.tagName) + '|' + a.hasAttribute('data-tm-target') + '|' + (a.getAttribute('data-tm-target') || '') : null; }`,
      );
      const want = await this.cdp.eval(
        `() => { const all = [...document.querySelectorAll('[data-tm-target]')]; all.sort((a, b) => Number(b.getAttribute('data-tm-target')) - Number(a.getAttribute('data-tm-target'))); return all[0] === document.activeElement; }`,
      );
      if (!want && now.type !== 'checkbox' && now.type !== 'radio' && now.type !== 'date')
        throw new Error(
          `[${this.task}] tap on ${label} did not focus the field (focus: ${focused}, box ${JSON.stringify(now.rect)})`,
        );
    }
    await settle(this.cdp, opts.wait ?? 700);
    await this.markScreen();
    return step;
  }
  async type(label, text) {
    argent(['keyboard', '--text', text]);
    this.texts++;
    this.steps.push({ kind: 'type', label, chars: text.length });
    await sleep(300);
  }
  // Native <select> and date pickers cannot be shown headless: the tap is real, the choice is set
  // through the DOM and counted as one more tap (the tap on the option in the native picker).
  async choose(label, css, value) {
    await this.tap(`${label} (open picker)`, { css, scope: 'page' });
    const ok = await this.cdp.eval(
      `(a) => { const e = document.querySelector(a.css); if (!e) return false; const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), 'value').set; let v = a.value; if (e.tagName === 'SELECT' && v.startsWith('~')) { const o = [...e.options].find((o) => new RegExp(v.slice(1), 'i').test(o.textContent)); if (!o) return false; v = o.value; } setter.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); e.blur(); return v; }`,
      { css, value },
    );
    if (!ok) throw new Error(`[${this.task}] could not choose ${value} in ${css}`);
    this.taps++;
    this.steps.push({
      n: this.taps,
      kind: 'pick',
      label: `${label} = ${value}`,
      note: 'native picker; option set through the DOM, counted as one tap',
    });
    await sleep(400);
  }
  async drag(label, fromSpec, toSpec) {
    const { now: a } = await this.bringIntoView(fromSpec);
    const b = await this.waitFor(toSpec);
    await syncArgent(this.cdp);
    argent([
      'gesture-drag',
      '--fromX',
      ((a.cx - a.screenLeft) / a.vw).toFixed(4),
      '--fromY',
      ((a.cy - a.screenTop) / a.vh).toFixed(4),
      '--toX',
      ((b.cx - b.screenLeft) / b.vw).toFixed(4),
      '--toY',
      ((b.cy - b.screenTop) / b.vh).toFixed(4),
    ]);
    this.taps++;
    this.steps.push({ n: this.taps, kind: 'drag', label, from: a.name, to: b.name });
    await settle(this.cdp, 900);
  }
  note(text) {
    this.notes.push(text);
  }
  summary(extra = {}) {
    const primaries = this.steps.filter((s) => s.primary);
    return {
      task: this.task,
      taps: this.taps,
      textEntries: this.texts,
      scrollGestures: this.scrolls,
      screensVisited: [...new Set(this.screens)].length,
      screens: [...new Set(this.screens)],
      primaryActions: primaries.map((p) => ({
        label: p.label,
        screen: p.screen,
        visibleWithoutScrolling: p.visibleOnArrival,
        yFraction: p.yFractionOnArrival,
        inBottomThird: p.bottomThirdOnArrival,
      })),
      steps: this.steps,
      notes: this.notes,
      ...extra,
    };
  }
}

export function argentTap(x, y) {
  return argent(['gesture-tap', '--x', String(x), '--y', String(y)]);
}
export function argentType(text) {
  return argent(['keyboard', '--text', text]);
}
export function argentScreenshot(out) {
  return argent(['screenshot', '--out', out]);
}
