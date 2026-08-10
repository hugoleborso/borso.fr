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

---

# Regression check at f88e1d0

**One regression found.** The French swatch labels on `/art/mondrian/` overflow
their fixed 44 px box and collide with each other at every viewport. Nothing
else regressed.

**The English-rendering FAIL is closed for the i18n layer.** Every string that
goes through i18next now renders in French, on every route, and stays French
when the browser asks for English. It is *not* closed for the whole page: the
generated artwork title on `/art/mondrian/` is still built in English, but that
string never went through i18next and was English at the baseline too.

Measured on 2026-08-08 against https://borso-fr-pr-40.preview.borso.fr.

## How this was checked

`agent-browser` (session `borsofr-regress`, Playwright) for the functional
walkthrough, the viewport measurements and the console. `@swmansion/argent` on
`chromium-cdp-9223` for the touch pass, with a raw CDP session alongside it
holding `Emulation.setDeviceMetricsOverride` and
`Emulation.setTouchEmulationEnabled`, because argent has no viewport tool. Every
touch measurement recorded `matchMedia('(pointer: coarse)')` true,
`matchMedia('(hover: none)')` true, `navigator.maxTouchPoints` 5 and
`devicePixelRatio` 3. `gesture-tap` was not used; taps went through
`Input.dispatchTouchEvent` directly, per the recipe.

No git command was run, so the commit was not confirmed from the repository. The
deployment under test served these assets, which differ from the ones the
baseline recorded:

```
/assets/index-CHaUu2qX.js        (baseline index-CVHgMh40.js)
/assets/twelveLabours-B1G5kIDW.js (baseline twelveLabours-BE6bufDT.js)
/assets/mondrian-BEQHHwFn.js      (baseline mondrian-BD9qADtU.js)
/assets/i18n-DY8502s4.js          (baseline i18n-9toV6Bm6.js)
/assets/fr-DSzqdk8r.js            (new — the baseline had no per-language chunk)
```

## Change 1, the site is pinned to French — holds

**In the shipped bundle.** `/assets/i18n-DY8502s4.js` ends with

```js
xe="fr";N.use(rt).init({resources:{fr:{translation:Ne}},lng:xe,fallbackLng:xe,
interpolation:{escapeValue:!1},returnNull:!1});
```

One catalogue, no detector plugin. Counting occurrences across
`fr-DSzqdk8r.js`, `i18n-DY8502s4.js`, `index-CHaUu2qX.js`, `mondrian-BEQHHwFn.js`
and `twelveLabours-B1G5kIDW.js`:

| String | Count | | String | Count |
|---|---|---|---|---|
| `The twelve` | 0 | | `Les douze` | 1 |
| `Welcome to` | 0 | | `Bienvenue` | 1 |
| `Date request` | 0 | | `Demande de date` | 1 |
| `The sisters` | 0 | | `Les sœurs` | 1 |
| `Mum` | 0 | | `Maman` | 1 |

`localStorage`, `i18nextLng`, `navigator.language`, `LanguageDetector` and
`en-US` each appear **0** times in all five chunks. The only `languageDetector`
hit is i18next's own internal `services.languageDetector` reference.

**In the browser.** With `agent-browser set headers
'{"Accept-Language":"en-US,en;q=0.9"}'`, so that `navigator.language` reads
`en-US` and `navigator.languages` is `["en-US"]`:

| Route | `documentElement.lang` | First rendered words |
|---|---|---|
| `/` | `fr` | `Bienvenue sur / BORSO.FR / Maman / Les sœurs …` |
| `/12-travaux/` | `fr` | `Les douze travaux. / LE PROJET / Douze défis par an …` |
| `/art/mondrian/` | `fr` | `ATELIER BORSO · DEPUIS 1999 / Mondrian / — GÉNÉRATEUR — …` |

The argent Chromium reached the same page independently with its own
`navigator.language` of `en-US` and also rendered French.

**No language key is read or written.** `Object.keys(localStorage)`,
`Object.keys(sessionStorage)` and `document.cookie` are all empty on every route,
before and after interaction.

**No raw key leaks.** Sweeping `document.body.innerText` plus every `alt`,
`title`, `aria-label` and `placeholder` on all five HTML routes for
dotted-identifier shapes and for unresolved `{{…}}` returned nothing but `8.5`,
`1.5` and `borso.fr`. All 179 keys in `fr.json` have a value; a flattened
comparison against `en.json` shows 0 keys missing on either side, and the 18
values that are byte-identical are proper nouns and format strings
(`Mondrian`, `De Stijl`, `Nocturne`, `Cascade`, `Palette`, `Strava`, `Distance`,
`{{weight}} px`, `{{percentage}}%`, `Composition · {{number}}`, `Art`,
`Saint-Georges → Notre-Dame-de-Lorette.`, `borso`, `fr`, and the three
`section.*` labels).

**Residual English, not from i18next.** Two places:

- The generated artwork title on `/art/mondrian/`, rendered as the page's `<h2>`
  and repeated under the frame: `A restless gesture in vermillion`,
  `A careful argument in saffron`, `A quiet song in color 1`. It is built in
  `apps/borso-fr/site/art/mondrian/titles.utils.ts:46` as
  `` `A ${adjective} ${noun} in ${dominantColor.toLowerCase()}` `` from
  hard-coded `ADJECTIVES` and `NOUNS` lists, and never touches the catalogue. In
  the `Libre` palette it also prints the English slot name (`in color 1`) while
  the swatch beside it is labelled `COULEUR 1`. Same behaviour at the baseline,
  where it read `A sudden gesture in saffron`, so this is not a regression — but
  it is the reason the page is not yet entirely French. Visible in
  `borso-fr/regress-mondrian-1280.png` and `borso-fr/regress-mondrian-375.png`.
- Two `alt` attributes hard-coded in the static family HTML: `Mom` on
  `/family/mom.html`, `Poop` on `/family/les-filles.html`. Neither goes through
  i18next. `/family/les-filles.html` also carries `Les filles`, so the two
  languages sit side by side on one page.

## Change 2, about forty first-time French strings — rendered and read

Every route was read as rendered text, not as source. `/12-travaux/` was walked
month by month through both editions — all 24 focus panels, each with its
status chip, kind chip, note and proof labels — and `/art/mondrian/` was walked
through all five palettes, all four animation modes, both pointer variants of
the studio note, and every swatch tooltip. Nothing rendered in English except
the generated title above.

The typographic space before `:` and `;` is **correct on `/art/mondrian/` and
missing on `/12-travaux/`**. Dumping the code point preceding every `:` `;` and
`»` in the rendered text:

- `/art/mondrian/` — `"e de De Stijl : "` preceded by `U+00A0`, and
  `"our l'habiter ; "` preceded by `U+00A0`. Correct.
- `/12-travaux/`, all 24 months — every one is `U+0020`. `" coupé la série ; "`,
  `" (max autorisé) ; "`, `" changements de vie ; "`, `"7 livres lus : "`,
  `" Dernière ligne : "`, `"début juillet : "`, and every closing `»` of every
  note. A plain space lets a line break orphan the punctuation.

No string in the catalogue contains a `?` or a `!`, so that half of the rule had
nothing to check.

### Translation quality

Everything below was read on the rendered page. The `Change` column is what a
native reader would write instead.

| Where | Rendered | Change to | Why |
|---|---|---|---|
| `/12-travaux/`, focus header | `1 sur 1 aboutis`, `0 sur 1 aboutis`, `1 sur 2 aboutis` | `1 sur 1 abouti` … or drop the participle: `Aboutis · 1 / 2` | Past participle must agree with the count. `1 … aboutis` is wrong in every month where one or fewer are done, which is 14 of the 24 panels. Half-scores (`0.5`, `1.5`) make an i18next plural rule awkward, so rewording is the cleaner fix. |
| `/12-travaux/`, everywhere | `8.5/20`, `1.5 sur 3`, `0.5/1` | `8,5/20`, `1,5 sur 3`, `0,5/1` | French decimal separator is the comma. The same page already writes `196,9 km`, `4 300 D+` and `3 900 m` in French convention, so the scores are the odd ones out. |
| `/12-travaux/`, all notes and the `«…»` wrapper | plain space before `:` `;` `»` | `U+00A0` | See above. `/art/mondrian/` already does this, so the site contradicts itself. |
| `/12-travaux/`, kind chip | `CHIFFRÉ` | `COMPTÉ` or `QUANTIFIÉ` | For `counted`. *Chiffré* reads first as "encrypted", second as "expressed in figures"; neither is the sense of a challenge you tally. |
| `/12-travaux/`, April 2026 proof | `Si pris en métro · 8h44` | `Équivalent en métro · 8h44` | For `By metro`. The elliptical *Si pris en…* has no subject and reads like a fragment next to the other labels, which are all noun phrases (`Distance totale`, `Temps en mouvement`, `Allure moyenne`). |
| `/12-travaux/`, March 2026 | `3h de HT par semaine` | `3h de renforcement par semaine` | The English spells it out as *strength training*; the French leaves an abbreviation a reader outside the author's circle cannot expand. Also `de HT` wants elision handling if it stays. |
| `/12-travaux/`, project blurb | `Liste fixée en janvier, consignée au fil de l'année.` | `Liste fixée en janvier, bilan consigné au fil de l'année.` | English: *the list is fixed in January and written up as the year goes*. As written, the list is what gets recorded all year, which contradicts its being fixed in January. |
| `/12-travaux/`, July 2025 note | `C'est les vacances tu connais.` | `C'est les vacances, tu connais.` | Missing comma before the tag. Register is right, punctuation is not. |
| `/`, date-request dialog | `… n’est plus disponible sur borso.fr - bisous quand même` | `… sur borso.fr — bisous quand même` | A hyphen is standing in for a dash. Inherited from the English string, which has the same flaw. |
| catalogue-wide | `n’est` (U+2019) in the dialog, `l'année`, `d'Annecy`, `qui l'habiter` (U+0027) everywhere else | one apostrophe | Two apostrophe characters in one catalogue. The curly one is the correct French typographic apostrophe. |
| `/art/mondrian/`, studio note | `… passez en Cascade pour laisser la pièce se réorganiser toute seule.` | `… laisser l'ensemble se réorganiser` | English is *let the room rearrange itself*. In a page about paintings, *la pièce* reads as "the artwork" at least as readily as "the room", so the image inverts: the composition rearranging itself, not the space around it. |
| `/art/mondrian/`, studio note | `Restez sur une palette pour l'habiter` | `Installez-vous dans une palette pour l'habiter` | *Hold a palette to sit with it.* `Restez sur` is the flat register; the rest of this page's copy is deliberately literary, so it stands out. Low severity, arguably a choice. |
| `/art/mondrian/`, animation mode | `Souffle` | `Respiration` | The four options are `Fixe` (adjective), `Dérive`, `Souffle`, `Cascade`. `Souffle` reads as a gust rather than breathing. Lowest-severity item here. |
| `/art/mondrian/`, under touch | title `Cliquer pour changer Couleur 1`, frame `Composition. Cliquer pour recomposer.` while the visible hint says `Touchez le tableau pour composer` | a coarse variant of both, `Touchez pour changer …` | Observed under coarse-pointer emulation: the visible hint switches to touch wording, the accessible names do not. Inherited from English (`Click to change {{name}}`), so not a regression. |

Two choices worth keeping, because they are better than a literal translation
would have been: `Passer la Flèche d'Or` drops the English gloss *ski test*
because the name is already known in French, and `Être admissible au CAPES de
maths` uses the exact French term for clearing the written round rather than a
paraphrase of *qualify for the oral*. `Les 12 travaux de Borso` lands the
Hercules idiom. `Sourde` for `Muted` is the right word for colours.

## Change 3, the mondrian date — locale fixed, capture still module-scope

The date renders in French. `document.querySelector('.meta').innerText` returns

```
CLASSIQUE
22 CHAMPS · 8 AOÛT 2026
```

on both browsers — uppercase is `text-transform`, the underlying string is
`8 août 2026`. It stayed French on the agent-browser page whose
`navigator.language` was `en-US`, and on the argent Chromium whose
`navigator.language` is also `en-US`, so the hard-coded `en-US` is gone.

The other half of the original bug is still there, and this is a source read
rather than a browser observation:
`apps/borso-fr/site/art/mondrian/App.tsx:30` still holds

```ts
const TODAY = new Date();
```

at module scope, and line 114 formats it as
`TODAY.toLocaleDateString(i18n.language, TODAY_LABEL_FORMAT)`. The *locale* is
now reactive; the *value* is still captured once per module load, so a tab left
open across midnight keeps printing yesterday. Not testable in one session
without a clock override, and not a regression — flagging it because the change
was described as fixing both halves.

## Regression found, the French swatch labels overflow their box

**What was done.** Opened `/art/mondrian/?palette=custom&seed=248BAC4B` at 375,
393 and 1280, and measured `clientWidth` against `scrollWidth` on the text
element inside each swatch label.

**What was expected.** The label text fits its box, as `COLOR 1 / COLOR 2 /
COLOR 3 / PAPER / INK` did at the baseline — see `borso-fr/argent-mondrian-custom-375.png`,
where the five labels sit under their swatches with clear gaps.

**What happened.** `Couleur 1`, `Couleur 2` and `Couleur 3` each need 56 px in a
42 px box, at all three widths:

| Label | `clientWidth` | `scrollWidth` | Overflow |
|---|---|---|---|
| `Couleur 1` | 42 | 56 | 14 px |
| `Couleur 2` | 42 | 56 | 14 px |
| `Couleur 3` | 42 | 56 | 14 px |
| `Papier` | 42 | 42 | none |
| `Encre` | 42 | 42 | none |

The label boxes start at x = 22, 74, 126, 178 and 230 and are 44 px wide, so the
gap between them is 8 px against a 14 px overrun, so the digits render on top of
the next label's first letter. On screen the row reads
`COULEUR 1COULEUR 2COULEUR 3PAPIER` with no separation, against
`COLOR 1  COLOR 2  COLOR 3  PAPER  INK` at the baseline. Compare
`borso-fr/regress-argent-mondrian-custom-375.png` with
`borso-fr/argent-mondrian-custom-375.png`.

This does not cause page-level horizontal scroll — the containing
`div.palette` measures `scrollWidth` 331 against `clientWidth` 331 — so the
overflow table below still passes. It is a text collision inside a fixed-width
box, caused by `Couleur N` being two characters longer than `Color N`.

The segmented controls are not affected: at 1280 every palette and animation
button reports `clientWidth === scrollWidth` (`Classique` 69/69, `Nocturne`
68/68, `Télécharger` 128/128), because those size to their content.

## Baseline re-confirmation

### Routes, status and overflow

`scrollWidth / clientWidth` from the browser, HTTP from `curl`.

| Route | HTTP | 375 | 393 | 1280 | Console |
|---|---|---|---|---|---|
| `/` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/12-travaux/` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/art/mondrian/` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/family/` | 404 application/xml | 917 / 375 FAIL | 917 / 393 FAIL | 1280 / 1280 pass | none |
| `/family/mom.html` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |
| `/family/les-filles.html` | 200 text/html | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass | none |

`agent-browser errors` and `agent-browser console` were empty on all five HTML
routes, before and after interaction. Across 384 recorded network requests the
only non-200/304 entries are the four `/family/` documents at 404, one
`/favicon.ico` 404 raised by Chromium's XML viewer on that same error document,
and one `.mp4` at 206, which is a normal range response. All five routes declare
`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` and
`/favicon.svg` returns 200 `image/svg+xml`, so the baseline's favicon fix holds.
No image has `naturalWidth === 0` on any route.

### WebGL and animation

The galaxy renders. `document.querySelector('#bg-canvas-wrap canvas')` is a
1280 × 633 canvas with a live context whose `UNMASKED_RENDERER_WEBGL` is
`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.
Stars are visible in `borso-fr/regress-home-1280.png` and
`borso-fr/regress-home-375.png`.

The mondrian composition animates. In `Dérive`, `getBoundingClientRect` on the
first six rects three seconds apart gave
`[[583.84,90.03,76.35],[582.81,147.97,76.47],[656.96,95.32,196.07],…]` then
`[[576.22,96.76,76.58],[577.89,150.4,76.68],[656.63,92.14,195.94],…]`.

### The five baseline defects

| # | Defect | Status |
|---|---|---|
| 1 | Every i18n string renders in English | **Closed** for the i18next layer. The generated artwork title on `/art/mondrian/` is still English, but it never went through i18next. |
| 2 | `/art/mondrian/` declares `lang="en"` | **Fixed.** `curl` returns `<html lang="fr">` on all five routes and the runtime value stays `fr` on all five. |
| 3 | `/family/` returns a raw S3 error document | **Still reproduces.** 404, `content-type: application/xml`, `server: AmazonS3`, `x-cache: Error from cloudfront`, body `<Error><Code>NoSuchKey</Code>…<Key>404.jpeg</Key>…</Error>`. `/404.jpeg` itself still returns 200 `image/jpeg`, 729401 bytes, and any other unknown path (`/does-not-exist`) also returns the XML. Chromium's XML viewer has no viewport meta, so it scrolls sideways: 917 / 375 and 917 / 393. Screenshot `borso-fr/regress-family-index-375.png`. |
| 4 | The `mom.html` video link is dead | **Still reproduces, unchanged.** The only link on the page is `http://borso.fr/coucou-mom/video.mp4`; it 301s to `https://`, which returns 404 and serves the 729401-byte `404.jpeg`. Still absolute to the production host. |
| 5 | Mondrian palette and animation buttons under 44 px | **Still reproduces.** Measured at 375 × 667 with coarse pointer: `Classique` `Sourde` `Nocturne` `Jardin` 165 × 37, `Libre` 329 × 36, `Fixe` `Dérive` 165 × 37, `Souffle` `Cascade` 165 × 36, the `Atelier` toggle 70 × 41 (was 69 × 41 — one pixel wider from the French label). The sliders (331 × 44), the swatches (44 × 44), `Composer →` / `Télécharger` (161 × 46) and the painting (343 × 343) still meet the floor. |

### The two defects the mobile audit recorded

- **`/family/` 404 with a missing fallback image.** Still reproduces — this is
  defect 3 above.
- **`/family/les-filles.html` overflowing by 7 px.** Does **not** reproduce. The
  page measures 375 / 375, 393 / 393 and 1280 / 1280. Its 34 images resolve to
  `/assets/les-filles-A3LdMjn_.png` and `/assets/poop-C58fcym5.png`, both 200,
  and none has `naturalWidth === 0`. Screenshot
  `borso-fr/regress-les-filles-375.png`.

### Interaction re-exercised

Through Playwright: the landing burger opens and closes and reports
`aria-expanded`, its labels are `Ouvrir le menu` / `Fermer le menu`, the `Art`
link navigates to `/art/mondrian/` and the `borso.fr` brand link on
`/12-travaux/` returns to `/`; the `Demande de date` dialog opens with
`La demande de date n’est plus disponible sur borso.fr - bisous quand même` and
a `Fermer` button; the `/12-travaux/` year toggle switches editions and all 24
month cards bring their month into focus; on `/art/mondrian/` pressing space
changes the seed in the URL (`?seed=0C920CC4` → `?seed=965F8738`), the
complexity slider ranges 6 to 60 (so `{{count}} champs` never renders `1 champs`),
`Composer →` changes the work, and the five palettes and four modes all apply.

Through touch, `Input.dispatchTouchEvent` on the argent Chromium at 375 × 667 with
`pointer: coarse`: the `Atelier` toggle opens the drawer (label flips to
`Fermer`), the `Libre` palette applies and reveals the five 44 × 44 swatches, a
tap on the painting composes a new seed
(`?seed=F36C5F85` → `?seed=E8D830B8`), the stage `Composer →` composes again
(`?seed=E8D830B8` → `?seed=A0546577`), the landing burger opens
(`aria-expanded` false → true, label `Ouvrir le menu` → `Fermer le menu`), and
the `/12-travaux/` year toggle switches `ÉDITION 2026` → `ÉDITION 2025`. The
studio note swaps to its coarse variant, `Touchez le tableau pour en composer un
autre`. Screenshots `borso-fr/regress-argent-mondrian-touch-375.png` and
`borso-fr/regress-argent-12-travaux-375.png`.

Three taps that first appeared to fail were the open drawer overlaying the
target, not a defect: with the drawer open at 375,
`document.elementFromPoint` at the painting's centre returns
`LABEL.swatch editable`. Closing the drawer first made every tap land. No
`Input.dispatchTouchEvent` call timed out in this run.

### Touch targets that the baseline recorded as fixed

Re-measured at 375 × 667 with coarse pointer, with the new French labels:

| Control | This run | Baseline |
|---|---|---|
| Landing burger | 44 × 44 | 44 × 44 |
| `Maman` | 70 × 45 | 70 × 45 |
| `Les sœurs` | 125 × 45 | 125 × 45 |
| `Art` | 44 × 45 | 44 × 45 |
| `Demande de date` | 209 × 45 | 209 × 45 |
| `Les 12 travaux de Borso` | 242 × 78 | 242 × 78 |
| `borso.fr` brand link | 74 × 46 | 74 × 46 |
| `/12-travaux/` year buttons | 63 × 44 | 63 × 44 |
| Mondrian sliders | 331 × 44 | 331 × 44 |
| Mondrian swatches | 44 × 44 | 44 × 44 |

## What could not be checked

**The midnight rollover of the mondrian date.** It needs a clock override or a
tab left open across midnight; neither was available. The locale half of the fix
was confirmed, the module-scope capture was read from source and not exercised.

**Rendering performance.** Both browsers rasterise through SwiftShader, so the 1
to 2 fps on the landing page measures the sandbox, not the page.

**No real device.** Linux on x86_64, no `/dev/kvm`, no Android platform tools, no
macOS, so software keyboards, iOS Safari and Android Chrome scroll behaviour,
touch event ordering and true device pixel ratio remain unverified.

**Graceful degradation without WebGL.** SwiftShader was always available, so the
no-WebGL path the earlier audit reported was never exercised.

**Accessibility and colour contrast.** `agent-browser a11y` was not run. This
pass covered loading, language, console, links, overflow, copy and touch
response only.

**412 px was not measured**, matching the baseline's scope of 375, 393 and 1280.

## Screenshots

`regress-home-1280.png`, `regress-home-375.png`, `regress-12-travaux-1280.png`,
`regress-12-travaux-375.png`, `regress-mondrian-1280.png`,
`regress-mondrian-375.png`, `regress-mom-375.png`, `regress-les-filles-375.png`,
`regress-family-index-375.png`, `regress-argent-mondrian-custom-375.png`,
`regress-argent-mondrian-touch-375.png`, `regress-argent-12-travaux-375.png`.
