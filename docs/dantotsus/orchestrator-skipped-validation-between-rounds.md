---
date: 2026-06-05
introduced-at: implementation
detected-at: review
severity: high
related-pr: "#26"
fix-pr: "#30"
fix-commits: [0618e8b]
eradication-level: 2
tags: [orchestrator, skill, state-machine, technical-validation, self-improvement-loop]
---

# The orchestrator stopped running the gate that catches "verdict says done, code says otherwise"

## Symptom

Across rounds 7→16 of run `2026-05-19-1937-pragma`, the orchestrator
advanced from `implement` to the next round on the strength of the
implementation sub-agent's own verdict plus a `curl` smoke-test — and
never dispatched `/technical-validation`. The bugs that slipped through
all share a shape:

- Round 10 verdict: *"SPA fallback in place: YES"* — the deployed
  CloudFront function had no `SPA_APPS`; deep links 404'd.
- Round 13 verdict: *"optimistic updates on 3 ops"* — `grep onMutate`
  returned **0** across all 10 query files.
- Round 15→17 verdicts said `done`; a later catch-up validation
  found the setlist deep-link route was never declared and `biome
  check` had 125 unaddressed diagnostics.

A `/technical-validation` dispatch — an isolated agent reading only the
spec + diff + brief — would have opened each file and seen the claim
was false. It was built for exactly this. It just wasn't being run.

## Root-cause chain

1. **Why were false verdicts believed?** Nothing independent checked
   them. The implementation sub-agent grades its own homework.
2. **Why no independent check?** The orchestrator skipped the
   `/technical-validation` dispatch between rounds 7 and 16.
3. **Why was it skipped?** A `curl` smoke-test *felt* like validation —
   it confirms the deployed Lambda boots and routes return non-5xx.
   But booting is not "does what the brief claimed".
4. **Why did the smoke-test feel sufficient?** The orchestrator
   standard names `/technical-validation` as a stage but does not make
   it a **non-skippable precondition** for leaving the `implement`
   stage — so under time pressure the cheaper proxy substituted for it.

**Root cause:** thought a green smoke-test gates a round, actually only
an isolated spec-vs-diff review gates a round — booting ≠ correct, and
the implementer's own `done` is not evidence.

## Detection failure causes

- **CI (tests / build):** the false claims passed typecheck, lint, and
  tests — code without `onMutate` still compiles and the mutations
  still work (just slowly); a missing route still builds.
- **Code review:** the orchestrator *was* the reviewer and accepted the
  sub-agent's verdict verbatim.
- **The dedicated reviewer existed but wasn't invoked** — the gate was
  present in the toolbox and absent from the loop.

## Countermeasure

- **Code (process):** the orchestrator standard now mandates a
  `/technical-validation` dispatch on the latest SHA before the run can
  advance out of any `implement` round whose verdict is `done`. A
  `curl`/runtime smoke-test is explicitly named as *not* a substitute.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — state-machine precondition in the orchestrator standard)

**Reference:** [PR #30](https://github.com/hugoleborso/borso.fr/pull/30) · commit `docs(meta): orchestrator must validate every implement round`

**The actual fix:** added to `.claude/skills/tech-lead-orchestrator/standard.md`
a hard precondition on the `implement → validate/ship` transition —
every `status: done` implementation verdict triggers a
`/technical-validation` dispatch on the current SHA, and the run may not
advance until that verdict returns; smoke-tests are advisory only. The
technical-validation standard additionally now opens the file when a
brief or verdict mentions `onMutate` / "optimistic" / a named routing
property, rather than trusting the prose (see sibling dantotsu).

**Sibling defects swept:** the same skipped-gate enabled
`orchestrator-shipped-with-stale-pr-description` and the round-13
optimistic-claim gap; both trace to "no isolated review between rounds".

## See also

- [`described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md) — the visual-validation analogue of trusting a claim over an artefact.
- [`docs/knowledge/tech-lead-orchestrator.md`](../knowledge/tech-lead-orchestrator.md)
- [`orchestrator-agency-overcorrected-on-product-decisions.md`](./orchestrator-agency-overcorrected-on-product-decisions.md) — the other orchestrator-discipline lesson from the same run.
