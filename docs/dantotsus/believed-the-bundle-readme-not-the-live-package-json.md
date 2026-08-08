---
date: 2026-05-14
introduced-at: conception
detected-at: implementation
severity: medium
related-pr: branch `claude/tech-lead-orchestrator-skill-dVKSm` (PR not yet opened)
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [<to-be-filled-by-kaizen-commit>]
eradication-level: 2
time-to-detect: ~50 minutes (spec → implement)
tags: [spec, technical-conception, skill, orchestrator, imported-briefs, adr]
---

# Believed the design bundle's README; never opened the live `package.json`

## Symptom

ADR [0002](../adr/0002-vendor-react-bits-galaxy-shader.md) shipped with this argument as its first bullet:

> *npm install `ogl` + the react-bits Galaxy package, render via React. Forces React + a bundler (Vite/Astro) into the app, taking `apps/borso-fr` from "plain HTML" to "React SPA" just to draw a background.*

Hugo's review surfaced the contradiction in one sentence:

> *Pourquoi ne pas utiliser le composant React dans ce cas si l'app est bundlée par vite ?*

The ADR's premise was wrong: `apps/borso-fr` was *already* on Vite, with `react@19` and `react-dom@19` installed and consumed by `art/mondrian`. The "preserve plain HTML / no bundler" argument that powered the vendoring decision was a non-issue — the bundler was already there. The shipped feature works (UX is correct), but the architectural choice (vanilla shader vendored locally vs npm-installed React component) was made on a picture of the repo that didn't match reality.

## Root-cause chain

1. **Why** did ADR 0002 argue "avoid forcing Vite + React"?
   Because the spec's *Q.O.D.* row "Build pipeline" said *"garder, `apps/borso-fr` reste plain HTML/CSS/JS. Switch à Vite quand le contenu le justifie."*

2. **Why** did the spec say that?
   Because the orchestrator session seeded the spec from the Claude Design handoff bundle. The bundle's `borso-fr/project/apps/borso-fr/README.md` described the workspace as `pnpm dev = python3 -m http.server` and `pnpm build = cp -R site dist`. The orchestrator read that file end-to-end and trusted it.

3. **Why** was the bundle's README trusted?
   The bundle's top-level `borso-fr/README.md` (the "CODING AGENTS: READ THIS FIRST" file) explicitly says *"Read every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together"*. That instruction reads as "treat the bundle's files as ground truth". The bundle's `apps/borso-fr/README.md` was followed accordingly.

4. **Why** didn't `/specification` cross-check against the live workspace?
   The skill's operating-mode step 5 ("Conduct research") listed *"industry standards + repo `docs/` + existing blueprints"*. It did NOT list *"live `apps/<slug>/package.json` and config files for any workspace the feature touches"*. In agent hands, the absence of an explicit step = the step doesn't happen. The skill assumed the spec author would naturally read both the brief and the live workspace; that assumption breaks when the spec author is an LLM following the standard literally.

5. **Why** didn't `/technical-conception` catch it?
   Step 2 ("Inventory the technical surface") was driven *from the spec* rather than *from the live workspace*. The agent took the spec's "plain HTML" framing as input to the inventory instead of running `ls apps/borso-fr/` and `cat apps/borso-fr/package.json` to populate the inventory first-hand.

6. **Why** was the false premise only caught at the implement stage?
   Because `/implementation`'s first action after reading the spec + plan is to actually open the target files. The first `cat apps/borso-fr/package.json` revealed `"build": "vite build"` and the React deps. By then the ADR was ratified, the plan was written, and Hugo had already confirmed direction. The orchestrator's correction at that point was a footnote in the implementation verdict — not a re-spec.

**Root cause:** the agent *thought* "an imported design brief is a faithful description of the target workspace"; *actually* an imported brief is a snapshot, possibly stale, possibly authored against a fork — and the source of truth for "what the workspace actually has" is the live `apps/<slug>/package.json`. If the orchestrator had run `cat apps/borso-fr/package.json` at `/specification` step 5, the Q.O.D. row "Build pipeline" would have said *"Vite + React already in place, used by `art/mondrian`"* and ADR 0002's first argument would have been moot — either the ADR wouldn't have existed, or it would have ratified the install-via-npm path.

## Detection failure causes

- **Typing / linter / CI:** N/A — the defect is at the ADR-level decision, not in code. The biome/typecheck/build gates all passed against the vanilla implementation, because the vanilla implementation is internally correct.
- **`/specification` step 12 ("re-read for inconsistencies"):** didn't fire because the spec was *internally* consistent. Step 12 says *"re-read the spec"*, not *"compare the spec against the live repo state"*. External inconsistency is invisible to that pass.
- **`/technical-conception` Pattern Coherence pass (step 3.5):** asked "does this introduce a new pattern?" The answer was framed as "first WebGL in the repo, contained locally" — true *within the spec's framing*, but the framing itself was off. The coherence question that would have surfaced the gap is *"does this introduce a new pattern that contradicts another part of the same app?"* (yes: vanilla shader next to React mondrian).
- **`/adr-writer`:** writes ADRs from the brief it's given. It doesn't second-guess premises; that's by design (a focused writer skill, not a fact-checker).
- **Code review (human):** Hugo didn't review the spec/ADR before `/implementation` ran. Even if he had, the ADR's stated argument *"preserve plain HTML"* is plausible-sounding without pulling up the current `package.json` in one's head. Asking the human to be the gate is exactly what the orchestrator loop is meant to avoid.

## Countermeasure

Two work items.

- **Code-level fix for the *current* feature:** a second `/tech-lead-orchestrator` run swaps the vanilla shader for the react-bits Galaxy as a React component mounted into `#bg-canvas-wrap`, adds `ogl` as an npm dep, and writes ADR 0003 (supersedes 0002) with the corrected premise. *This work item is tracked separately and lands in the same kaizen PR or its successor.*
- **Structural fix for the *defect class*:** see *Eradication* below. The two skill standards gain a hard "open the live workspace before believing the brief" step the agent can't compress past.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — skill-side enforcement, two standards updated in one PR)

**Reference:** PR (this kaizen) · commit `<this-commit>`

**The actual fix:**

`.claude/skills/specification/standard.md` — operating-mode step 5 gains a hard sub-rule on live-workspace cross-check, and a new common-mistakes row drives it home with a back-link to this dantotsu.

```diff
- | 5 | Conduct research (external + internal) | Why | Industry standards + repo `docs/` + existing blueprints | Reduces "test & learn" |
+ | 5 | Conduct research (external + internal) | Why | Industry standards + repo `docs/` + existing blueprints + **live state of any `apps/<slug>/` / `infra/<slug>/` the feature touches** | Reduces "test & learn". **Imported briefs (Claude Design bundles, Figma exports, hand-off READMEs) are *snapshots* of intent, not of the live workspace. Before drafting any Q.O.D. row that names a toolchain — build pipeline, framework, test runner, package manager, deploy mechanism — `cat apps/<slug>/package.json`, skim its config files, and surface every divergence between the brief and the live state as an explicit Q.O.D. row. The brief documents intent; `package.json` documents reality. The spec is where they reconcile.** |
```

```diff
+ | I trust the imported brief about the workspace's toolchain | The spec inherits a stale picture of `apps/<slug>/` from a hand-off README or design-bundle README; a Q.O.D. row about *build pipeline / framework / test runner / deploy mechanism* gets ratified on a wrong premise, and an ADR built on top is invalidated in code review. The brief documents *intent*; `apps/<slug>/package.json` documents *reality*. Cat the live `package.json` before locking any toolchain-shaped Q.O.D. row. See [`docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../../../docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md). |
```

`.claude/skills/technical-conception/standard.md` — operating-mode step 2 gains the parallel rule (the plan also inventories from the live workspace, not from the spec), and a common-mistakes row.

```diff
- | 2 | Inventory the technical surface | list of frameworks, pipelines, data stores |
+ | 2 | Inventory the technical surface | list of frameworks, pipelines, data stores — **read from `apps/<slug>/package.json` and its config files directly, not just from the spec. A surface in the live workspace that contradicts the spec is a re-spec trigger; escalate via `AskUserQuestion` before continuing.** |
```

```diff
+ | Inventory mirrors the spec instead of the live workspace | If the spec carried a stale picture of the workspace's toolchain (typical when the brief comes from a hand-off README or external design bundle), the plan inherits the picture and the ADR ratifies it. The fix is mechanical: `ls apps/<slug>/` and `cat apps/<slug>/package.json` *before* listing surfaces. Divergences become Q.O.D. clarifications back to the spec, not silent "we'll handle it in code". See [`docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../../../docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md). |
```

The two skills now have the *same* defence at the same level of the funnel: cat `package.json` first, believe the brief second. The compression vector ("I'll just take the brief's word for it") is closed at both ends — if `/specification` slips, `/technical-conception` catches; if both slip, the divergence at minimum surfaces in the plan's inventory and forces an escalation.

**Sibling defects swept:** none yet — this is the first orchestrator run to ingest an external design bundle. Prospectively applies to every future feature that touches an existing workspace, especially when the brief comes from outside the repo (Claude Design, Figma exports, hand-off READMEs from previous engineers).

## See also

- [`docs/dantotsus/spec-skill-let-perspectives-be-skipped.md`](./spec-skill-let-perspectives-be-skipped.md) — same family: `/specification` silently accepted a default the agent should have confronted with the user. The eradication pattern (skill-standard checklist that the agent can't compress past) is the same.
- [`docs/dantotsus/plan-open-question-leaked-to-validator-fail.md`](./plan-open-question-leaked-to-validator-fail.md) — adjacent family: a gap in the planning artefact propagated past the gate. Here the gap was external (live state); there it was internal (open question).
- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) — adjacent family: the implementer didn't check what was already available before re-implementing. Here the orchestrator didn't check what the workspace already had before locking the architecture.
- [`docs/adr/0002-vendor-react-bits-galaxy-shader.md`](../adr/0002-vendor-react-bits-galaxy-shader.md) — the ADR whose first argument was invalidated. A successor ADR 0003 (corrected premise, react-bits Galaxy installed as a React component) is the code-level countermeasure mentioned above.
