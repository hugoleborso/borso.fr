# Preview validation — borso-fr, PR 40

FAIL, five defects. The site loads and works, but the i18n refactor shipped an
English catalogue: every string that goes through i18next renders in English, so
`/12-travaux/` and `/art/mondrian/` are entirely in English.

Target: https://borso-fr-pr-40.preview.borso.fr
Measured on 2026-08-08.

## What was checked and how

The route list comes from `apps/borso-fr/vite.config.ts`, which declares five
HTML entry points, plus `/family/` because the earlier audit reported it.

`agent-browser` 
(session `borso-fr`, Playwright) did the functional walkthrough and the viewport
measurements. `@swmansion/argent` on `chromium-cdp-9223` did the touch
interaction, with a second CDP session holding
`Emulation.setDeviceMetricsOverride` and `Emulation.setTouchEmulationEnabled`
open alongside it, because argent has no viewport tool. Every phone measurement
below recorded `matchMedia('(pointer: coarse)')` true, `matchMedia('(hover: none)')`
true and `navigator.maxTouchPoints` 5.

## Results by route and viewport

Each cell is `document.documentElement.scrollWidth` over
`document.documentElement.clientWidth`. HTTP status is from `curl -I`.

| Route | HTTP | 375 | 393 | 1280 | Console errors |
|---|---|---|---|---|---|
| `/` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/12-travaux/` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/art/mondrian/` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/family/` | 404 application/xml | 690 / 375 FAIL | 690 / 393 FAIL | 1280 / 1280 pass | none |
| `/family/mom.html` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/family/les-filles.html` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |

`agent-browser errors` and `agent-browser console` were empty on every route,
before and after interaction. `agent-browser network requests` on the landing
page returned nine requests, all 200, with no failed favicon request.

The WebGL galaxy renders. `document.querySelector('#bg-canvas-wrap canvas')`
returns a 1280 by 633 canvas with a live context whose `UNMASKED_RENDERER_WEBGL`
is `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.
Stars are visible in `borso-fr/home-1280.png` and `borso-fr/home-375.png`.

The mondrian composition animates. It is not a `<canvas>`; it is absolutely
positioned `div.rect` elements. In `Drift` mode, sampling the first six rects
two seconds apart gave `[[476.39,120.17,660],[480.15,122.09,177.95],[479.53,239.44,178.58],…]`
then `[[476.39,120.17,660],[473.79,116.13,178.22],[472.22,236.58,178.44],…]`.
`Compose →` changed the work from `№ 5275 / A sudden gesture in saffron` to
`№ 5750 / A quiet song in vermillion`.

Interaction that was exercised and responded: the landing burger opens and
closes and its menu links navigate; the `Demande de date` button opens its
dialog; the `/12-travaux/` year toggle switches the 2025 and 2026 editions; a
filmstrip month card changes the month in focus; the `borso.fr` brand link
returns to `/`; on `/art/mondrian/` the `Studio` drawer opens, drag-scrolls, and
the `Custom` palette switch, the palette buttons, the animation modes, `Compose`
and tapping the painting all work.

## Defect 1, every i18n string renders in English

What was done. Opened `/12-travaux/` and `/art/mondrian/` and read
`document.body.innerText`, then fetched the deployed locale chunk and searched it.

What was expected. French, per the brief that the app carries a single French
catalogue.

What happened. Both pages are entirely in English. `/12-travaux/` reads
`The twelve / labours.`, `THE PROJECT`, `Twelve challenges a year, one a month.
The list is fixed in January and written up as the year goes.`, `EDITION`,
`RUNNING TALLY`, `DAILY`, `ONE-OFF`, `REMAINING`, `MONTH IN FOCUS · 08/2026`,
`THE YEAR IN TWELVE CHAPTERS`, `click to bring into focus`, and twelve English
month names. `/art/mondrian/` reads `BORSO’S ATELIER · EST. 1999`,
`— GENERATOR —`, `A studio for composing in the manner of De Stijl: rectangles,
primary colors, and the deliberate quiet between them.`, `Complexity`,
`Line weight`, `Color balance`, `Classic / Muted / Nocturne / Garden / Custom`,
`Still / Drift / Breathe / Cascade`, `Compose →`, `Download`, `STUDIO NOTE`,
`22 FIELDS · AUGUST 8, 2026`, and in the custom palette
`COLOR 1 / COLOR 2 / COLOR 3 / PAPER / INK` with titles like
`Click to change Color 1`.

No raw i18n key leaked anywhere. The keys resolve correctly; the catalogue
values are the English text.

The evidence is in the artefact, not only on screen. Both `/12-travaux/` and
`/art/mondrian/` preload `/assets/i18n-9toV6Bm6.js`, which contains
`pt=["fr","en"]` and `Le="fr"`, so `fr` is the default and the resolved
language. Searching that chunk:

```
The twelve         2
Les douze          0
Bienvenue          0
Welcome to         1
Maman              0
Mum                1
Les sœurs          0
The sisters        1
Demande de date    0
Date request       2
```

`"first-line":"The twelve"` appears literally in the shipped bundle. There is no
French string anywhere in it, and none in `index-CVHgMh40.js`,
`twelveLabours-BE6bufDT.js` or `mondrian-BD9qADtU.js` either.

The landing page and the two family pages look French only because their French
is hard-coded in the static HTML. `curl` on `/` returns
`<div class="welcome">Bienvenue sur</div>` and
`<li><a href="family/mom.html">Maman</a></li>` in the served document, and
`index-CVHgMh40.js` consumes no `home.*` key at all, so the landing page never
reaches the catalogue. Wiring it up would turn the landing page English too.

Screenshots: `borso-fr/12-travaux-375.png`, `borso-fr/12-travaux-1280.png`,
`borso-fr/mondrian-375.png`, `borso-fr/mondrian-1280.png`,
`borso-fr/argent-mondrian-custom-375.png`.

## Defect 2, /art/mondrian/ declares lang="en"

What was done. `curl` on each route, then read `document.documentElement.lang`
after hydration.

What was expected. `lang="fr"` on all five routes.

What happened. The served document for `/art/mondrian/` is `<html lang="en">`,
and the runtime value stays `en`. The other four routes serve and keep `fr`.

```
/                        lang=fr   runtime fr
/12-travaux/             lang=fr   runtime fr
/art/mondrian/           lang=en   runtime en
/family/mom.html         lang=fr   runtime fr
/family/les-filles.html  lang=fr   runtime fr
```

## Defect 3, /family/ returns a raw S3 error document

Known. This is defect 4 of the earlier mobile viewport audit and it still
reproduces.

What was done. `curl -I` and `curl` on `https://borso-fr-pr-40.preview.borso.fr/family/`,
then opened it at 375.

What was expected. Either a page or a rendered 404.

What happened. HTTP 404 with `content-type: application/xml`, `server: AmazonS3`,
`x-cache: Error from cloudfront`, and this body:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message><Key>404.jpeg</Key><RequestId>4EST1TMZHX89AVGP</RequestId><HostId>Yp68UsDkYzxU64fkCCBxvSvG1TlpY55Xc0qACLd9nsI+O++C84dNsgEhyFvurzZHBskWRfBgdaUC9JAJFICJooQG5yy4VhKl</HostId></Error>
```

Chromium renders it with its built-in XML viewer, which carries no viewport meta
tag, so the document scrolls sideways at both phone widths: 690 over 375 and 690
over 393. The measured numbers differ from the earlier audit's 1885 over 980
because this run emulated the viewport through `agent-browser set viewport`
rather than `Emulation.setDeviceMetricsOverride` with `mobile: true`; the failure
is the same one.

A direct request to `/404.jpeg` still returns 200 `image/jpeg`, so the
configured fallback resolves only when the request passes through the CloudFront
viewer function, exactly as the earlier audit described. Nothing in the site
links to `/family/`; the menu links to `family/mom.html` and
`family/les-filles.html` directly.

Screenshot: `borso-fr/family-index-375.png`.

## Defect 4, the mom.html video link is dead

What was done. Read the only link on `/family/mom.html`, then followed it.

What was expected. A video.

What happened. The link is `http://borso.fr/coucou-mom/video.mp4`. It 301s to
`https://borso.fr/coucou-mom/video.mp4`, which returns HTTP 404 and serves the
729401-byte `404.jpeg` fallback. On the preview host the same path returns 404
`application/xml`. The link is also absolute to the production host, so it leaves
the preview even when it works.

This is not a regression from the refactor. `apps/borso-fr/site/family/mom.html`
line 89 has carried that href, and the earlier audit did not check it.

## Defect 5, the mondrian palette and animation buttons are under 44 px

What was done. Measured every button in the `Studio` drawer at 375 by 667 with
coarse pointer emulation on.

What was expected. At least 44 px tall, the floor the rest of this app now meets.

What happened. `Classic`, `Muted`, `Nocturne` and `Garden` measure 165 by 37,
`Custom` 329 by 36, `Still` and `Drift` 165 by 37, `Breathe` and `Cascade` 165 by
36, and the `Studio` toggle 69 by 41. The sliders (331 by 44), the swatches
(44 by 44) and `Compose →` / `Download` (161 by 46) do meet it, which is what
makes the segmented controls stand out.

Screenshot: `borso-fr/argent-mondrian-custom-375.png`.

## Earlier defects that no longer reproduce

Checked against `docs/features/meta/mobile-viewport-audit/report.md`.

- **Defect 5, les-filles.html broken images widening the layout.** Fixed. All 33
  images now resolve to `/assets/poop-C58fcym5.png` with `naturalWidth` 2003 and
  render at 30 px. `document.images` filtered on `naturalWidth === 0` returns an
  empty list. The page measures 375 / 375, 393 / 393 and 1280 / 1280, where it
  previously failed at all four profiles including desktop. Screenshot:
  `borso-fr/les-filles-375.png`.
- **Defect 15, `/favicon.ico` 404 on every load.** Fixed. The document now
  declares `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` and
  `/favicon.svg` returns 200 `image/svg+xml`. No favicon request appears in
  `agent-browser network requests`. `/favicon.ico` itself still 404s, but nothing
  asks for it.
- **Defect 10, mondrian custom swatches hidden behind hover.** Fixed. The
  swatches are 44 by 44, and their labels `COLOR 1 / COLOR 2 / COLOR 3 / PAPER /
  INK` are separate always-visible elements rather than `.name` spans at opacity
  0. The studio note also swaps to a coarse-pointer variant, reading `Tap the
  painting to compose anew` under touch emulation and `Press space to compose
  anew` otherwise.
- **Defect 11, mondrian sliders 24 px tall.** Fixed. All three range inputs
  measure 331 by 44.
- **Defect 12, borso-fr controls below 44 px.** Fixed for the three items named.
  The `Art` menu link is 44 by 45 (was 42 by 45), the `/12-travaux/` year buttons
  are 63 by 44 (was 63 by 34), and the `borso.fr` brand link is 74 by 46 (was 74
  by 18). The burger is 44 by 44. The remaining menu items are `Maman` 70 by 45,
  `Les sœurs` 125 by 45, `Demande de date` 209 by 45 and `Les 12 travaux de
  Borso` 242 by 78.

## What could not be checked

**Rendering performance says nothing about real devices.** The landing page runs
at 1 to 2 frames per second in this sandbox: measured with a
`requestAnimationFrame` counter, 3 frames in 2033 ms on the argent Chromium at
375 by 667 with device pixel ratio 3, 2 fps in agent-browser at 375 by 667, and
under 1 fps at 1280 by 800. Both browsers rasterise through SwiftShader, so this
is the software GL path and not a measurement of the page.

**Argent input on the landing page is unreliable for the same reason.**
`gesture-tap` succeeded once and opened the burger, confirmed by
`aria-expanded` flipping to `true`, then five further attempts returned
`CDP request Input.dispatchMouseEvent (id=…) timed out`. The identical taps
succeed on `/12-travaux/` and `/art/mondrian/`, and Playwright's click on the
same burger at 375 works every time. The menu overlay adds a blur on top of the
WebGL loop, and the renderer cannot acknowledge input inside argent's timeout.
So the landing menu's touch behaviour was verified once with argent and
otherwise through Playwright, not repeatedly through argent.

**No real device was involved.** The sandbox is Linux on x86_64 with no
`/dev/kvm`, no Android platform tools and no macOS, so software keyboards, iOS
Safari and Android Chrome scroll and `100vh` behaviour, touch event ordering and
true device pixel ratio rendering all remain unverified.

**Graceful degradation without WebGL was not tested.** The earlier audit recorded
an uncaught `TypeError: Cannot set properties of null (setting 'renderer')` when
WebGL was unavailable. This run always had SwiftShader available, so that path
was never exercised.

**Accessibility and colour contrast were not audited.** `agent-browser a11y` was
not run; this pass covered loading, console errors, language, links, overflow and
touch response only.

**412 px was not measured.** The brief asked for 375, 393 and 1280, so the Pixel
8 profile from the earlier audit was skipped.
