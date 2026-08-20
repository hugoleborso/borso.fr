# Judging an animation you cannot watch

Observed 2026-08-19 and 2026-08-20 while building the lightspeed departure on
borso.fr (PR #63). The container renders the landing page's WebGL galaxy in
software, and every instinct for checking an animation fails here in a way that
looks like a bug in the code instead of a limit of the harness.

## The measurements that lie

**A screenshot has no speed in it.** Two frames of an accelerating starfield,
one at cruising and one at two hundred times cruising, are both a field of
stars. The only things a still shows are the side effects — a denser field
because layers cycle faster, longer rays because the glow is up. Several rounds
of tuning went into stills before that was admitted; the first tuning pass
lowered the peak from 120 to 45 on the strength of a still, and had to be
reversed.

**Real-time screenshots land wherever the compositor happens to be.** A
`waitForTimeout(300)` after a click, then a screenshot, does not give you the
300 ms frame. Measured here: the page produced a new rendered frame roughly
every 400 ms, so a video recording of the jump showed about six real frames for
an 800 ms animation.

**`getComputedStyle` lags by a reading.** Read in the same tick as the class
change, it returns the pre-transition value, because the transition has not
started. Read later under heavy throttling, it came back one step behind
consistently enough to invert the conclusion: opacity read `1` during the fade
and `0` after the class was removed. That single artefact turned a working fade
into twenty minutes of hunting a specificity fight that did not exist.

## What actually works

**Pin the animation and screenshot.** Set `currentTime` on every running
animation, then capture. The frame is then the moment it claims to be, rather
than the moment the compositor got round to:

```js
await page.evaluate((currentTime) => {
  for (const animation of document.getAnimations()) {
    animation.pause();
    animation.currentTime = currentTime;
  }
}, 320);
```

**For an animation driven by a module rather than by CSS, pin its clock.** The
galaxy reads its intensity from a frame timestamp, so re-stamping the jump's
start every frame holds it at one moment of the acceleration and lets you
photograph it at leisure:

```js
const store = await import('/warp/warp-jump.store.ts');
const pin = () => {
  store.beginJump(performance.now() - elapsedMilliseconds);
  requestAnimationFrame(pin);
};
```

**Capture through CDP, not `page.screenshot`.** Playwright's screenshot waits
for stability and times out on a page with a navigation in flight.
`Page.captureScreenshot` over a CDP session returns immediately.

**Keep the page alive while it tries to leave.** To photograph a departure
without the page actually departing, route the destination to a handler that
never fulfils. `route.abort()` is wrong — it makes Chromium render its own error
page over the thing you are trying to see.

**Measure the mechanism, not the pixels, when you can.** The most useful number
in the whole exercise came from decoding video frames and computing mean
brightness and frame-to-frame change: brightness climbed 8.5 → 17.4 and the
change between successive rendered frames grew 4.1 → 11.6 across the jump. That
proves the acceleration is real and monotonic without needing to see it.

## What still cannot be answered from here

Whether it *feels* right at 60 Hz. That is a property of hardware this
container does not have, and no amount of instrumentation substitutes for the
operator opening the preview. Say so plainly and hand over the one number that
tunes it, rather than implying the check was complete.

The arithmetic is worth doing in advance so the handover is useful. For this
shader: the field sweeps at `starSpeed × multiplier / 10 × speed` cycles a
second, so 200 gives 7.2 cycles a second, a star crossing in 0.14 s, eight
frames at 60 Hz. Below about five frames per crossing it reads as flicker
rather than speed. That bound is what let a ceiling be chosen without seeing it.

## See also

- [`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md)
  — the repository's own browser tooling, and why raw Playwright needs
  `executablePath` and a proxy here.
- [`../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md`](../dantotsus/a-tailwind-variant-that-compiled-to-nothing.md)
  — the bug whose diagnosis the lagging `getComputedStyle` derailed.
- [`../dantotsus/two-starfields-one-of-them-fake.md`](../dantotsus/two-starfields-one-of-them-fake.md)
  — why a validation written against your own design cannot tell you the design
  is wrong.
