---
date: 2026-08-15
introduced-at: conception
detected-at: local
severity: low
related-pr: '#49'
fix-commits: [256c89f06e]
eradication-level: 1
eradication-paths: [.gitignore, scripts/architecture/architecture-graph.ts]
time-to-detect: hours
tags: [architecture-map, tooling, generated-files, git]
zone: scripts/architecture/architecture-graph.ts
---

# A generated file cannot contain its own commit, so a byte gate on it failed the commit after the one that moved it

## User impact

A session that edited a document under `docs/standards/` committed it fine. Its **next** commit then failed, naming an app nobody touched:

```
[pre-commit] checking the architecture pages
  docs/architecture/pragma-architecture.html is out of date.
  Run `pnpm exec tsx scripts/architecture/architecture-graph.ts`.
```

| | Seen | Expected |
| --- | --- | --- |
| The commit after a standards edit | Refused on `pragma-architecture.html`, on a commit touching neither `apps/` nor the generator | Accepted, because no code moved |
| After regenerating | Accepted, and the next standards edit brought the refusal back | One fix that holds |

## Causal chain

- The commit after a standards edit (commit N+1) was refused as out of date.
  - The page the generator built at N+1 held history up to N. The committed page stopped at N−1.
    - At commit N, pre-commit ran before the commit existed, so `git log` returned history up to `HEAD`, the parent N−1. That page was committed and passed.
      - The page embedded each standard's history from `git log`, the one input that is not the working tree. a58ab3193, "standards get a tab with a commit diff", added it: "The text at every commit ships with the page".
        - The page was committed and gated to the byte. d562e9159, the commit that created it, says "pre-commit runs the same script with `--check` ... so the page cannot fall behind the code".
          - Committing a generated file beside a `--check` that diffs it against git was the repository's practice. ADR 2026-08-20T1031 counts fourteen files built that way (Method).

## Root cause of occurrence

*Thought readers open the committed page, so it must be committed and kept equal to the code byte for byte. Actually every consumer rebuilt it from source before use, so the committed copy had no reader, and the byte gate's only subject was its own output.* (Method)

The consumers, as read on PR #49:

| Consumer | What it does | Needed the commit? |
| --- | --- | --- |
| `pages.yml` | regenerates, then publishes to GitHub Pages | no, its own comment said "a page published from a stale file is impossible" |
| `architecture.yml` | regenerates the head model, then diffs it against a worktree of the merge base | no |
| `--check` | compared the committed page against a fresh one | only because the page was committed |

Under that practice, adding a `git log` input made a page that can never match itself. A file cannot contain the sha of the commit that adds it.

## Detection failure causes

- **Pre-commit:** the gate compared bytes, not "the map matches the code". It passed on the commit that moved the history and failed one commit late, on a file the failing commit did not touch.
- **The workaround:** regenerating cleared it every time, so each hit cost a short regeneration and nothing accumulated a signal.

## Countermeasure

Commit `256c89f06` (then `50eb3dbf4`) stopped committing the pages. `.gitignore` covers `docs/architecture/*.html`. A first attempt fenced the git-derived bytes and taught `--check` to skip them. It worked, and it spent a renderer change and a comparison special case to keep a file nothing read, so it was replaced by the deletion.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `256c89f06` (PR #49), then `9326a890a`, "refactor(meta): a generated file is not committed" (PR #70), which applied the rule to every generator.

```diff
+docs/architecture/*.html
+docs/architecture/*-architecture.json
```

There is no committed page to fall behind. ADR 2026-08-20T1031 made the rule general: a file is committed when it is an input a person wrote or accepted, and ignored when it is an output. Every generator's `--check` lost its byte comparison and keeps only its validations. `scripts/reports.sh` rebuilds the outputs before anything reads them.

**Proof it can fail:** after the change, a commit that edits a standard and runs `--check` without regenerating passes. A `*.utils.ts` that gains an export without regeneration still failed, on `borso-fr-architecture.json`, the model that was then still committed (measured on PR #49). The model has been an ignored output since `9326a890a`.

**Similar instances:** the ADR lists the fourteen generated files of the time, all now ignored. `git ls-files docs/architecture` lists no generated file. `scripts/standards/hotspots.ts` and `scripts/standards/temporal-coupling.ts` also read the history, and are outputs under the same rule.
