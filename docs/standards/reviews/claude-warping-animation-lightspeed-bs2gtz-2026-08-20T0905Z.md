# Standards review — claude/warping-animation-lightspeed-bs2gtz against origin/main

Verdict: PASS
Ledger: c9cc14decde4
Reviewed: 2 file(s). Sealed: 2. Findings: 0.

Scope this pass: `seal.ts verify --base origin/main` reported two uncleared files
of thirteen changed — `apps/borso-fr/site/src/12-travaux/main.tsx` and
`apps/borso-fr/site/src/art/mondrian/main.tsx`. Both were read in full at
working-tree content. The other eleven hold current seals and were not touched.

## Findings

None.

## Sealed

- `apps/borso-fr/site/src/12-travaux/main.tsx` — 17 lines, read in full. The
  branch adds `import { installWarpDrive }` and the bare `installWarpDrive()` at
  line 8. Bare means the default, `PAGE_FADE_DURATION_MILLISECONDS = 420`
  (`warp-jump.core.ts:26`, defaulted at `warp-drive.ts:71`), and 420 ms is the
  hold `warp-drive.ts:72` writes into `--transition-hold`, which
  `12-travaux/index.html:22` reads back as
  `duration-[var(--transition-hold)] [.jumping_&]:opacity-0` — so the fade and
  the navigation timer are one number, which is what the Fade entry in
  `apps/borso-fr/VOCABULARY.md` claims. Against the checklist: the file carries
  no prose comment, only the `@FollowsBlueprint site-entrypoint` tag, so there is
  nothing to restate, narrate or describe an absence of; `main.tsx` is the
  composition-root name the layer convention recognises; no `find…` / `get…` /
  `build…` / `project…` / `select…` to check behaviour on; no boolean to negate;
  no disable comment; no effect; no hand-written type mirroring a derived one;
  nothing is rendered here beyond `<App />`, so neither the route-composition nor
  the 375-pixel bullet has a subject.
- `apps/borso-fr/site/src/art/mondrian/main.tsx` — 55 lines, read in full. Same
  delta, `installWarpDrive()` at line 34, same 420 ms default, and
  `art/mondrian/index.html:17,21` carry the same
  `duration-[var(--transition-hold)] [.jumping_&]:opacity-0` pair, so the claim
  holds on this page too. The pre-existing content clears the same bullets:
  `COMPOSE_ON_SPACE` is a named dispatch table rather than a magic literal,
  `isComposeKeyEvent` is an unnegated boolean name, the `popstate` and `keydown`
  listeners each call one named function from its own module, and every comment
  in the file is a machine tag rather than prose. The `@FollowsBlueprint
  site-entrypoint` claim holds against `apps/pragma/site/src/main.tsx:16-32`:
  side-effect imports, one install call before the mount, a missing `#root`
  thrown rather than swallowed, and one `createRoot(...).render` of one tree.

## Unclear

- None.

## Outside the checklist

- `apps/borso-fr/VOCABULARY.md:85-86` — *"`warp-drive.ts` installs it on all
  three built pages, and the caller passes the length the click is held for."*
  Not faulted, recorded so a later pass does not read it as new. Two of the three
  callers do not pass a length: `12-travaux/main.tsx:8` and
  `art/mondrian/main.tsx:34` are bare and take the default, and only
  `home-page.ts:16` passes one (`JUMP_DURATION_MILLISECONDS`). The design claim
  the sentence makes is still the one `warp-drive.ts:10` makes — *"How long the
  click is held is the caller's"* — and taking a default is a caller accepting
  the standard length, which the Fade entry already spells out at 420 ms. The
  count is also loose against this file's own *Entry point* entry, which says
  Vite builds five HTML files; the two under `site/family/` carry no module
  script and no internal link, so they have nothing to depart from. Both readings
  are defensible, and the earlier 08:50 finding on the sentence this one replaced
  is discharged.
- The prior pass's finding at `VOCABULARY.md:140` — *"Only the landing page
  installs it"* — is gone from the working tree; the section now reads
  *"Every page has one: a Jump where there is a Galaxy, a Fade where there is
  not."*, which matches the three call sites.
- Neither `docs/standards/hotspots.md` nor `docs/standards/temporal-coupling.md`
  names either file or anything under `site/src/warp/`, so neither page
  constrained this judgement.
