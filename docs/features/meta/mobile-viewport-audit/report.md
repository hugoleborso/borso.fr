# Mobile viewport audit of the PR 40 preview sites

## Verdict

FAIL. Eight of the fifteen screen states measured scroll the page body sideways
on at least one phone profile. The two worst cases are the `last-loop-lepin`
spectator view, where every route lays out at 446 CSS pixels inside a 375 pixel
viewport, and the `borso-fr` `/family/` route, which returns a 404 whose
fallback image is missing, so the browser renders a raw S3 error document at 980
pixels wide. The self punch confirmation button that a runner has to press mid
race sits partly off the right edge of an iPhone SE screen, and its label
contrast is fine at 11.61 to 1, so the problem is position and size rather than
readability. Sixteen defects are listed below, and four areas could not be
verified.

## How the audit ran

The tool was `@swmansion/argent` version 0.19.0, driving its Chromium over the
Chrome DevTools Protocol, using the preinstalled browser at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. There was no fallback to
`agent-browser`.

Argent 0.19.0 has no tool that sets a viewport size, a device pixel ratio, or a
pointer type on a Chromium target, so the audit held a second protocol session
open alongside argent and used it to send `Emulation.setDeviceMetricsOverride`
and `Emulation.setTouchEmulationEnabled`. Coarse pointer emulation did work, and
every phone measurement below recorded `matchMedia('(pointer: coarse)').matches`
as true, `matchMedia('(hover: none)').matches` as true, and
`navigator.maxTouchPoints` as 5.

Two launch flags deviate from a stock browser, and both are network level rather
than layout level. Chromium could not complete a TLS handshake through the
session proxy until it was passed `--ssl-version-max=tls1.2`, and every page
failed with `ERR_CONNECTION_RESET` before that. It was also passed
`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader` so the WebGL
background on the `borso-fr` home page renders, because an earlier pass used
`--disable-gpu` and produced a WebGL console error that a real phone would not
produce.

## Results by route and profile

Each cell reports `document.documentElement.scrollWidth` over
`document.documentElement.clientWidth`. A route fails when the scroll width is
larger than the client width, which means the page body itself scrolls sideways.

| App | Route or state | iPhone SE, 375 | iPhone 15 Pro, 393 | Pixel 8, 412 | Desktop, 1280 |
|---|---|---|---|---|---|
| `borso-fr` | `/` | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `borso-fr` | `/12-travaux/` | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1265 / 1265 pass |
| `borso-fr` | `/art/mondrian/` | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `borso-fr` | `/family/` | 1885 / 980 FAIL | 1816 / 980 FAIL | 1749 / 980 FAIL | 1280 / 1280 pass |
| `borso-fr` | `/family/les-filles.html` | 382 / 375 FAIL | 414 / 393 FAIL | 431 / 412 FAIL | 1294 / 1280 FAIL |
| `borsouvertures` | landing | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `borsouvertures` | side set to black | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `borsouvertures` | variations list | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `borsouvertures` | drill board | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1265 / 1265 pass |
| `pragma` | `/login` | 375 / 375 pass | 393 / 393 pass | 412 / 412 pass | 1280 / 1280 pass |
| `last-loop-lepin` | `/` spectator | 446 / 375 FAIL | 446 / 393 FAIL | 446 / 412 FAIL | 1265 / 1265 pass |
| `last-loop-lepin` | self punch modal | 446 / 375 FAIL | 446 / 393 FAIL | 446 / 412 FAIL | 1265 / 1265 pass |
| `last-loop-lepin` | `/archives` | 446 / 375 FAIL | 446 / 393 FAIL | 446 / 412 FAIL | 1280 / 1280 pass |
| `last-loop-lepin` | `/r/tanguy` runner | 446 / 375 FAIL | 446 / 393 FAIL | 446 / 412 FAIL | 1280 / 1280 pass |
| `last-loop-lepin` | `/admin` PIN screen | 446 / 375 FAIL | 446 / 393 FAIL | 446 / 412 FAIL | 1280 / 1280 pass |

## Defect 1, every last-loop-lepin route lays out 446 pixels wide

`apps/last-loop-lepin/site/src/styles/chrome.css` line 1 declares
`.app { display: grid; grid-template-rows: auto 1fr; }` with no
`grid-template-columns`, so the implicit column is sized `auto` and its minimum
is the minimum content width of the widest grid item. Line 8 declares
`.topbar { display: flex; padding: 0 var(--d-6); height: 56px; }` with no
wrapping, so the brand block and the three navigation links stay on one line and
give the topbar a minimum content width of 446 pixels. The grid column grows to
446 pixels, the `.main` row inherits it, and the whole document scrolls sideways.

Evidence is in `last-loop-lepin-spectator-iphone-se.png`,
`last-loop-lepin-archives-iphone-se.png`, `last-loop-lepin-admin-iphone-se.png`
and `last-loop-lepin-runner-iphone-se.png`. In the spectator screenshot the
`Admin` navigation link, the CSV download button and the right half of the
countdown are all cut off at the right edge.

The Leaflet map is not the cause. The `.course-map` container measures 396
pixels, matching its card, and `div.card.map-card` already sets
`overflow-x: hidden`, so the map tiles and the overlay stay inside their own box.

The fix was tested in the live browser by injecting a stylesheet, after which the
page measured 375 over 375 with no sideways scroll:

```css
.app {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr;
}

.topbar {
  flex-wrap: wrap;
  height: auto;
  min-height: 56px;
  padding: 8px var(--d-6);
}

.nav {
  margin-left: 0;
}
```

## Defect 2, the self punch confirmation button is partly off screen

The primary action in the self punch modal measures 99 by 41 pixels with its
right edge at x 409, while the iPhone SE viewport is 375 pixels wide, so roughly
34 pixels of the button sit outside the screen. A runner has to scroll sideways
to press it. Evidence is `last-loop-lepin-self-punch-iphone-se.png`, where the
label reads `Je suis` because the rest is cut off.

The cause is defect 1 rather than the modal stylesheet.
`apps/last-loop-lepin/site/src/styles/punch.css` line 154 sets
`.self-punch-modal { width: 100%; max-width: 420px; }`, which is correct, but
`.self-punch-modal-backdrop` on line 133 is `position: fixed; inset: 0`, and
Chromium sizes it to the 446 pixel layout width rather than the 375 pixel
viewport. With the defect 1 fix injected, the same button measured a right edge
of 338 inside a 375 pixel viewport.

Label contrast is not a problem. The computed colours are `rgb(6, 20, 11)` on
`oklch(0.82 0.2 145)`, a ratio of 11.61 to 1, and the cancel button is 16.72 to
1. Both are far above the 4.5 to 1 threshold, so the label stays readable in
bright sun.

## Defect 3, last-loop-lepin controls are shorter than 44 pixels

`apps/last-loop-lepin/site/src/styles/components.css` line 83 gives `.btn` a
padding of `10px 16px` and a font size of 13 pixels, producing a height of 41
pixels. Line 115 gives `.input` and `.select` a padding of `10px 12px`, also 41
pixels. `apps/last-loop-lepin/site/src/styles/chrome.css` line 64 gives `.nav a`
a padding of `8px 14px`, producing 35 pixels.

Measured at the iPhone SE profile: the self punch buttons at 99 by 41 and 85 by
41, the admin PIN field and its button at 195 by 41, the archive CSV links at 130
by 31 and 157 by 31, the runner name links at 140 by 20, and the three navigation
links at 73 by 35, 83 by 35 and 69 by 35.

```css
.btn,
.input,
.select {
  min-height: 44px;
}

.nav a,
.nav button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
```

## Defect 4, the borso-fr /family/ route returns a raw S3 error document

`https://borso-fr-pr-40.preview.borso.fr/family/` answers with HTTP 404 and a
content type of `application/xml`, and the body is a `NoSuchKey` error naming
`404.jpeg`. Chromium renders the XML with its built in viewer, which carries no
viewport meta tag, so the layout viewport falls back to 980 pixels and the page
scrolls sideways on all three phone profiles. Evidence is
`borso-fr-family-iphone-se.png`.

Two separate things are wrong. First, `apps/borso-fr/site/family/` contains
`les-filles.html` and `mom.html` but no `index.html`, and the CloudFront function
at `infra/cdk/src/internal/cf-host-routing-function.code.js` rewrites a directory
style request to `/<app>/pr-<n>/family/index.html`, so the key genuinely does not
exist. Second, `infra/shared/lib/shared-stack.ts` line 104 configures the
previews distribution with `{ httpStatus: 404, responsePagePath: '/404.jpeg' }`,
and CloudFront does not re-run the viewer request function for a custom error
response, so it asks the origin for the bucket root key `404.jpeg`, which is
absent. A direct request to `/404.jpeg` returns HTTP 200, because that request
does go through the function and becomes `/borso-fr/pr-40/404.jpeg`.

The fix has two parts, and both are operator actions rather than code changes.
Upload a `404.jpeg` object to the root of the previews bucket so the configured
fallback resolves, and either add an `apps/borso-fr/site/family/index.html` or
stop treating `/family/` as a route. Nothing in the site points at `/family/`
today, because the home page menu links to `/family/mom.html` and
`/family/les-filles.html` directly.

## Defect 5, the borso-fr family page loads broken images that widen the layout

`apps/borso-fr/site/family/les-filles.html` line 143 builds an image element from
a string, `poop.innerHTML = '<img src="poop.png" ...>'`, and Vite cannot rewrite a
URL inside a JavaScript string, so the request goes to `/family/poop.png` and
returns HTTP 404. The three static `<img src="poop.png">` tags on lines 120, 124
and 128 do work, because Vite rewrites those to hashed assets.

Every runtime injected image therefore renders as a broken image placeholder
wider than the 30 pixel inline size the stylesheet expects. The elements are
absolutely positioned with `left` values up to `95%`, so the widest placeholders
reach x 382 on a 375 pixel viewport, and the page scrolls sideways on all four
profiles including the desktop reference. Evidence is
`borso-fr-family-les-filles-iphone-se.png`.

Import the image so the bundler rewrites it, for example
`const poopUrl = new URL('./poop.png', import.meta.url).href` in a module script.
A stylesheet guard belongs there too, because an absolutely positioned decoration
should never widen the page:

```css
html {
  overflow-x: clip;
}

.poop {
  max-width: 30px;
}
```

## Defect 6, the last-loop-lepin runner profile does not load at all

`apps/last-loop-lepin/site/src/App.tsx` line 105 renders
`<RunnerFichePage editionSlug="lepin-2026" />`, but the live edition slug
returned by the API is `3l-lepin-2026`. The page requests
`/api/standings/lepin-2026`, receives HTTP 404, and renders only the message
`Coureur introuvable.` Evidence is `last-loop-lepin-runner-iphone-se.png`.

The defect is functional rather than visual, and it blocked the layout audit of
the runner profile, because no URL reaches a working version of the page. Take
the edition slug from the current edition response the way `SpectatorPage`
already does.

A second navigation problem sits next to it. Tapping a leaderboard chip on the
spectator view opens the self punch modal and never navigates to `/r/<slug>`, so
a spectator has no way to reach a runner profile from the leaderboard.

## Defect 7, borsouvertures renders 480 tiny focusable elements

`apps/borsouvertures/site/components/atoms/MiniBoard.tsx` line 17 renders a
`react-chessboard` board as decoration inside each `button.selector-card`. The
library gives every square a `role="button"` and a `tabindex="0"`, and each
square measures 17 by 24 pixels at the iPhone SE profile. The landing view
exposes 480 such elements, and the variations view exposes 643.

Nested interactive elements inside a button are invalid HTML, they add hundreds
of tab stops, and each one is far below the 44 by 44 pixel floor. Evidence is
`borsouvertures-landing-iphone-se.png`. Mark the decorative board non
interactive so only the surrounding card stays a tap target.

## Defect 8, borsouvertures toggles and the board style select are 36 pixels tall

`apps/borsouvertures/site/styles/widgets.css` line 47 gives `.toggle-slider` a
padding of `0.2rem` and no minimum height, so the Learn and Play toggle measures
171 by 36 and the White and Black toggle 182 by 36.
`apps/borsouvertures/site/styles/base.css` line 110 gives `.select` a padding of
`0.4rem 0.6rem`, so the board style select measures 129 by 36. The Back button
reaches 70 by 42, still short. Add `min-height: 44px` to `.toggle-slider`,
`.select` and `.btn`.

## Defect 9, the pragma login controls are shorter than 44 pixels

`apps/pragma/site/src/components/atoms/input.variants.ts` line 16 sizes the input
with `px-3 py-2 text-[13px]` and no height, so the password field measures 293 by
37. `apps/pragma/site/src/components/atoms/button.variants.ts` line 31 sizes the
medium button with `px-3 py-1.5 text-[13px]`, so the button measures 293 by 33.
`apps/pragma/site/src/routes/Login.tsx` line 112 gives the show password button
`absolute inset-y-0 right-0 flex items-center pr-3`, so it measures 30 by 37.
Evidence is `pragma-login-iphone-se.png`.

This app uses Tailwind, so the fix belongs in the variant tables. Add `min-h-11`
to the `md` and `lg` sizes in both `cva` calls, and give the show password button
a real touch area such as `w-11 justify-center` instead of `pr-3`.

## Defect 10, the mondrian custom palette hides its labels behind hover

`apps/borso-fr/site/art/mondrian/styles/controls.css` line 90 sets
`.swatch .name { opacity: 0 }` and line 105 raises it to `0.7` only under
`.swatch:hover`. Line 111 declares `.swatch.editable:hover::before` with a pencil
character, so the only sign that a swatch can be edited appears on hover. On a
coarse pointer neither rule ever fires.

Confirmed live at the iPhone SE profile with
`matchMedia('(pointer: coarse)').matches` reading true. The rail shows five
editable swatches, each 32 by 32 pixels, each with a `.name` element whose
computed opacity is `0`. Evidence is
`borso-fr-art-mondrian-custom-iphone-se.png`.

```css
.swatch {
  min-width: 44px;
  min-height: 44px;
}

@media (hover: none) {
  .swatch .name {
    opacity: 0.7;
  }

  .swatch.editable::after {
    content: '✎';
  }
}
```

## Defect 11, the mondrian sliders are 24 pixels tall

The three range inputs measure 331 by 24 at the iPhone SE profile, well under the
44 pixel floor for a control a user drags with a thumb. The file is
`apps/borso-fr/site/art/mondrian/styles/controls.css` line 25, class `.slider`.
Give the input a taller box while keeping the track thin with
`min-height: 44px; background: transparent;`.

## Defect 12, borso-fr controls below 44 pixels

The burger menu on the home page opens correctly and does not overflow, but the
`Art` link inside it measures 42 by 45, two pixels narrow. On `/12-travaux/` the
`BORSO.FR` link measures 74 by 18 and the year buttons measure 63 by 34.
Evidence is `borso-fr-home-menu-iphone-se.png` and
`borso-fr-12-travaux-iphone-se.png`.

## Defect 13, the Leaflet controls and attribution links are below 44 pixels

On the spectator view the zoom controls measure 30 by 30 and the attribution
links measure 43 by 11, 71 by 11 and 35 by 11. The sizes come from Leaflet's own
stylesheet rather than from the app, and the start marker icon measures 16 by 16.
Override in `apps/last-loop-lepin/site/src/styles/map.css`:

```css
.leaflet-control-zoom a {
  width: 44px;
  height: 44px;
  line-height: 44px;
}
```

## Defect 14, pragma requests an authenticated endpoint before login

Opening the root redirects to `/login` and then requests `/api/instruments`,
which answers HTTP 401 and produces a console error on every visit to the login
screen. The request is useless before the user has a session, so gate the query
on an authenticated state.

## Defect 15, borso-fr requests a favicon that does not exist

`/favicon.ico` returns HTTP 404 and the browser logs a console error on every
page load. Add the file, or declare an explicit icon link in
`apps/borso-fr/site/index.html`.

## Defect 16, last-loop-lepin aborts a request on the spectator view

Loading the spectator view records one `net::ERR_ABORTED` network failure. It
could not be attributed to a specific URL, because the failure event carried no
URL and the page polls the standings endpoint several times per load. The likely
cause is a poll cancelled when the component re-renders, and it has no visible
effect.

## What could not be verified

Everything behind the `pragma` shared password stays unaudited. The login screen
renders correctly at all four profiles, and requesting `/catalog` or `/setlists`
redirects to `/login`, so the rest of the application is unreachable without a
credential. The auditor did not guess at a password.

The `last-loop-lepin` runner profile layout stays unaudited, because defect 6
makes the page render a single error line at every width.

Everything behind the `last-loop-lepin` admin PIN stays unaudited for the same
reason. The PIN screen itself renders correctly apart from the shared topbar
overflow and the 41 pixel control heights.

No real device was involved. The sandbox is Linux on x86_64 with no `/dev/kvm`,
no Android platform tools and no macOS, so argent could drive only its Chromium
target. Four things a viewport resize cannot test therefore remain open, which
are the software keyboard covering a form, iOS Safari and Android Chrome
differences in scroll chaining and in `100vh` against a dynamic toolbar, touch
event ordering, and how a hairline border or a small font renders at a real
device pixel ratio. See
[`docs/knowledge/agentic-device-testing.md`](../../../knowledge/agentic-device-testing.md).

Colour contrast was measured only for the self punch buttons. No other text was
checked against a threshold.

Whether the `borso-fr` home page degrades gracefully on a phone that blocks WebGL
is unknown. An uncaught `TypeError: Cannot set properties of null (setting
'renderer')` appeared when WebGL was unavailable, which suggests it does not.

## A note on when these measurements were taken

The deployed previews were built from commit `14fc404`. While the audit ran, the
working tree moved on, and `apps/borso-fr/site/12-travaux/` and
`apps/borsouvertures/site/components/` were both restructured by the parallel
refactors. Every file and line number quoted above was re-checked against the
tree at the end of the run. The measurements describe the deployed build.
