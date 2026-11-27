---
date: 2026-05-03
introduced-at: conception
detected-at: qa
severity: high
related-pr: '#6'
fix-commits: [e5cb098bf0, e08ae6434]
eradication-level: 5
eradication-paths: [.claude/skills/technical-conception/template.md]
time-to-detect: hours
tags: [react, spec, validators, url-state]
zone: apps/borso-fr/site/src/art/mondrian
---

# A copied link showed a friend a different painting

## User impact

A visitor shares a Mondrian by copying the address bar. The friend who opens
it should see the same painting.

| | Seen | Expected |
| --- | --- | --- |
| Fresh visit to `/art/mondrian/`, no `?seed=` | A painting renders, the address bar stays `/art/mondrian/` | The address bar shows `?seed=<the seed on screen>` |
| Visit to `?seed=garbage` | A new painting renders, `?seed=garbage` stays in the bar | The bar shows the seed that was generated |

Every first visit without a valid seed was affected. Visits that arrived with a
valid `?seed=` were not. The `visual-validator` measured it, rows 03 and 29 of
`docs/features/borso-fr/mondrian-atelier/validation/visual-validation-2026-05-03-2202.md`.

## Causal chain

- The address bar did not carry the seed on screen after a fresh visit.
  - `App.tsx` resolved a seed at mount and never wrote it back. It had a
    `popstate` listener (URL to state) and `compose()` (state to URL through
    `pushState`), and no mount-time `replaceState`. Commit `ac49ae999` wrote it.
    - The implementer wrote one effect per row of the plan. The plan's rows Q7
      and Q14 name three URL writes, compose, palette change and cascade tick:

      ```text
      | Q7 | Seed + palette in URL | … Compose → `pushState`. Palette change → `replaceState`. Cascade tick → `replaceState`. |
      ```

      No row names the write on first paint (Material).
      - The plan dropped a step the spec held. The spec's happy path, step 2,
        said "seed reflected into `?seed=…` via `history.replaceState`" (read
        with `git show ac49ae999:docs/features/borso-fr-mondrian-atelier/spec/spec.md`,
        line 37). The plan's only mapping section was "How each spec decision
        becomes code", one row per Q number. Happy-path steps carry no Q
        number, so step 2 had no row to land in (Method).

## Root cause of occurrence

*Thought the plan's rows listed every URL write the spec asked for, actually
the plan only traced the spec's decision rows, and the first-paint write lived
in a happy-path step.* (Material, from a Method gap upstream)

The plan the implementer walked, at `ac49ae999`, has rows Q7 and Q14 for URL
writes and none for mount. The spec at the same commit names the mount write in
its happy path. No plan template existed then. The one that exists today
keeps the same shape: "Every Q.O.D. number and every 'Changes' entry from the
spec maps to a row" (`.claude/skills/technical-conception/template.md`).
Whether the implementer
also had the spec loaded is not recorded (inferred: the implementation skill
reads both, so the plan's table won).

The first version of this entry said the spec never named the mount write.
The spec at the faulty commit contradicts that.

## Detection failure causes

- **Linter:** an effect that is missing is not a misused effect, so no rule
  fires.
- **Local validation:** the screenshot script always passed a `?seed=`, so no
  local run opened the page without one.
- **Unit tests:** they covered the pure `*.utils.ts` helpers. The missing write
  belonged in `App.tsx`, which no unit test rendered.
- **`/technical-validation`:** its category A walks the plan's rows. A write no
  row named was invisible to it.
- **`/visual-validation`:** caught it, because it opens the running page and
  reads the URL.

## Countermeasure

Commit [`e5cb098`](https://github.com/hugoleborso/borso.fr/commit/e5cb098bf0)
added a mount-time effect calling `history.replaceState` with the resolved seed
and palette. `replaceState`, not `pushState`, so Back does not land on a
before-load entry. Visual rows 03 and 29 passed on the next run.

## Eradication

**Type:** knowledge (level 5).

**Reference:** the first version of this entry shipped a required *On-mount
side-effects* section in the `/specification` template (commit `88b1178cf`).
Commit [`e08ae6434`](https://github.com/hugoleborso/borso.fr/commit/e08ae6434)
removed it a day later and moved it to a *Mount-time contract* table in
`.claude/skills/technical-conception/template.md`, which holds today. It is a
written prompt in a template. Nothing refuses a plan that leaves it empty.

The code has since moved the store out of React.
`apps/borso-fr/site/src/art/mondrian/composition-url.ts` reads the URL through
`useSyncExternalStore`, resolves `INITIAL_STATE` at module load, and exports
`mirrorResolvedStateIntoUrl()`. `main.tsx` line 41 still calls it as a separate
step:

```ts
mirrorResolvedStateIntoUrl();
```

**Proposed:** fold the `replaceState` into the module-level resolution in
`composition-url.ts`, so computing `INITIAL_STATE` writes it to the URL in the
same statement, and delete `mirrorResolvedStateIntoUrl`. A resolved state that
the URL does not carry then cannot exist. Make that shape the
`hook-external-store` blueprint for every URL-backed store, so the next store
copies a resolution that writes. This removes the URL instance.

**Proposed, for the Method cause:** a spec step can still vanish between spec
and plan, because `.claude/skills/technical-conception/template.md` line 15
still maps only "Every Q.O.D. number and every 'Changes' entry from the spec".
Add "every numbered happy-path step" to that mapping rule, and delete the
*Mount-time contract* table (line 21), which covers one kind of step the rule
would then cover. Hold the rule with a pre-commit check in the shape of
`scripts/check-spec-records.sh` that refuses a new `plan.md` with no row for a
numbered happy-path step of its spec. A step the spec names could then not be
dropped by the plan, whatever kind of write it asks for.

**Proof it can fail:** not tried. The proposal is not built.

**Similar instances:** `grep -rn 'useSyncExternalStore' apps/*/site/src` lists
the other external stores. Each one that resolves a default from the URL or
storage carries the same two-path shape.
