---
date: 2026-05-14
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#14'
fix-commits: [853780e1c8]
eradication-level: 5
eradication-paths: [.claude/skills/specification/standard.md, .claude/skills/technical-conception/standard.md]
time-to-detect: ~50 minutes (spec → implement)
tags: [spec, technical-conception, skill, orchestrator, imported-briefs, adr]
zone: .claude/skills/specification
weak-point: prose-stands-in-for-a-check
---

# Believed the design bundle's README, never opened the live `package.json`

## User impact

The operator ratified an architecture decision built on a false picture of
his own app. The feature worked, but on the wrong design, and a second
orchestrator run had to redo it.

| | Seen | Expected |
| --- | --- | --- |
| ADR [2026-05-14T1300](../adr/2026-05-14T1300-vendor-react-bits-galaxy-shader.md), first argument | "Forces React + a bundler (Vite/Astro) into the app, taking `apps/borso-fr` from "plain HTML" to "React SPA" just to draw a background." | `apps/borso-fr` already builds with Vite and has `react@19`, so the React component installs with no new toolchain |

The operator's review, quoted: "Pourquoi ne pas utiliser le composant React
dans ce cas si l'app est bundlée par vite ?"

## Causal chain

- The ADR chose to vendor a vanilla shader to keep `apps/borso-fr` free of Vite and React.
  - Its first argument came from the spec's Q.O.D. row "Build pipeline".

    ```
    garder, `apps/borso-fr` reste plain HTML/CSS/JS. Switch à Vite quand le contenu le justifie.  ← ❌ the app was already on Vite
    ```

    - The orchestrator wrote that row from the Claude Design bundle's `apps/borso-fr/README.md`, which said `pnpm dev = python3 -m http.server` and `pnpm build = cp -R site dist`.
      - The bundle's top README told coding agents "Read every file it pulls in", and the session read the bundle end to end. The live `apps/borso-fr/package.json`, with `"build": "vite build"` and `react@19`, was never opened in that session. (Material)

## Root cause of occurrence

*Thought the design bundle's README described the app as it is, actually it was a snapshot of an older state, and the app's own `package.json` already ran Vite and React.*

Material. When the spec row was written, the agent's context held the stale
README and not the live `package.json`. Nothing in `/specification` or in a
hook brought the live file to that moment. The first `cat
apps/borso-fr/package.json`, at `/implementation`, revealed the truth.

## Detection failure causes

- **Typing, lint, CI:** the defect was a decision, not code. The vanilla shader was internally correct and passed every gate.
- **`/specification` re-read step:** it checks the spec against itself. The spec was consistent with its own false premise.
- **`/technical-conception` inventory:** it listed the technical surface from the spec, not from the workspace.
- **ADR writer:** it writes from the brief it is given and does not test premises.
- **Operator review:** the spec and the ADR reached him before any file of the app had been opened, and "preserve plain HTML" sounds plausible without the `package.json` in view.

## Countermeasure

A second orchestrator run mounted the react-bits Galaxy as a React component,
added `ogl` as a dependency, and wrote
[ADR 2026-05-14T1341](../adr/2026-05-14T1341-react-bits-galaxy-as-react-component.md),
which supersedes 2026-05-14T1300.

## Eradication

**Type:** knowledge (level 5). Two skill standards gained a written step. The
original entry labelled it level 2, but a sentence in a skill refuses nothing.

**Reference:** commit `853780e1c8`. `.claude/skills/specification/standard.md`
step 5 now says, before any Q.O.D. row naming a toolchain, to "`cat
apps/<slug>/package.json`, skim its config files, and surface every divergence
between the brief and the live state". `.claude/skills/technical-conception/standard.md`
step 2 says to read the surface "from `apps/<slug>/package.json` and its
config files directly, not just from the spec". Both still hold, read on
2026-11-27.

**Proposed:** a `PreToolUse` check under `scripts/hooks/checks/`, wired in
`scripts/hooks/hook.ts`, that fires when a `Write` targets a
`docs/features/<app>/<slug>/` spec, plan or a `docs/adr/` file, and prints the
`scripts` and dependencies of `apps/<app>/package.json` into the context.
`mockup-reads-visual-rules.core.ts` already shows the shape: a check that
prints the app's rules once per session at the moment of writing. The live
toolchain would then sit in the context of every spec, plan and ADR as it is
written, whatever brief came before it.

**Proof it can fail:** none. A written step refuses nothing.

**Similar instances:** the specification and technical-conception standards
are the two places a spec or plan is drafted. This was the first run to import
an external design bundle, so no earlier instance was found.
