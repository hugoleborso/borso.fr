---
date: 2026-11-15
introduced-at: implementation
detected-at: linter
severity: low
related-pr: '#343'
fix-commits: [98834cadd]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/lint-write.core.ts, scripts/hooks/hook-events.ts]
time-to-detect: minutes
tags: [pragma, eslint, hooks, harness, self-improvement-loop]
zone: apps/pragma/site/src/components/organisms/AppShell.tsx
weak-point: prose-stands-in-for-a-check
recurs: [the-shell-that-scrolled-inside-a-window-that-still-could]
---

# The rule that knew the answer and waited for the commit to say it

## User impact

No pragma user saw the defect. The cost fell on the session that shipped #343, which built a whole first draft of the still header on a shape the repository already forbids, then rewrote it.

| | Seen | Expected |
| --- | --- | --- |
| First draft of the still header | A shell whose `<main>` scrolls, and an implementation built on it | A shell where the window scrolls and the header stays put |
| When the rule spoke | At the lint run before the commit | At the edit that gave `<main>` an overflow class |

The session's own log, at 22:51 on 2026-11-14 (`docs/features/pragma/fixed-header-content-bounce/kaizen.md`): *"I reached for a scrolling main to keep the header still, which a dantotsu and a lint rule already forbid; only the lint run caught it, after the code was written."*

## Causal chain

- The session wrote a still header on a `<main>` that scrolls, then rewrote it.
  - To keep the header still, it gave `<main>` in `AppShell.tsx` an overflow class, so the content scrolls inside it instead of the window.

    ```tsx
    // apps/pragma/site/src/components/organisms/AppShell.tsx, first draft, never committed
    <main className="… overflow-y-auto"> {/* ❌ a second scroller inside a window that can still scroll */}
    ```

    - A scrolling `<main>` is the common way to pin a header. The fact that forbids it here lived in [`the-shell-that-scrolled-inside-a-window-that-still-could.md`](./the-shell-that-scrolled-inside-a-window-that-still-could.md) and in the rule `borso(no-scroll-container-on-main)`, whose message links that entry.
      - The session's context at the edit held neither. Dantotsus carry no `triggers:`, so the knowledge hook never prints one. The rule's message reaches an agent only when lint runs, and lint ran before the commit. (Material)

## Root cause of occurrence

*Thought a `<main>` that scrolls keeps the header still and changes nothing else, actually it is a second scroller inside a window that can still scroll, and iOS scrolls that window for the keyboard and leaves an offset with nothing under it.*

Material, under the agentic rule. The fact was written in the earlier dantotsu and in the rule's message, and neither was in the session's context when it wrote the line. The session says so itself: it learned of both "after the code was written".

## Detection failure causes

- **Format hook:** `posttool-format-write.sh` ran the formatter after each write and deliberately no linter: *"A lint fix is deliberately not run ... Lint stays a gate that reports, and the author fixes it."* The reason was the autofix rewriting code. A report alone changes nothing in the file, and nothing ran one.
- **Knowledge trigger:** it matches entries under `docs/knowledge/` by path or command. The lesson lived in a dantotsu and a lint rule, which it does not read.
- **Type-aware lint cost:** a full `oxlint` on one pragma component took about 4 s, because tsgolint builds the workspace program (measured 2026-11-15). A per-write lint looked too slow.

## Countermeasure

Commit `98834cadd` (PR #348) added a PostToolUse hook. After every Edit, Write and MultiEdit of a `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` or `.cjs` file, it lints that one file with every rule except the type-aware ones, from a config derived from `.oxlintrc.json` with `typeAware` off. That took about 1.1 s on `AppShell.tsx` (measured). Errors return to the agent as context, so the rule's message, with its dantotsu link, lands one edit after the shape appears. It never blocks the edit. The commit gate stays the enforcement and still runs the type-aware rules.

The derived config sits at the root, gitignored as `.oxlintrc.write.json`, because oxlint resolves `jsPlugins` and override `files` globs from the config's folder. A copy in `node_modules/.cache/` loaded but matched none of the overrides, so the planted defect passed silently (measured).

## Eradication

**Type:** DevX check (level 2).

**Reference:** commit [`98834cadd`](https://github.com/hugoleborso/borso.fr/commit/98834cadd) (PR #348). The shell hook moved to TypeScript as `lintWrite` in `scripts/hooks/checks/lint-write.core.ts` in `458e886c4` (PR #411). It is registered under `PostToolUse` in `scripts/hooks/hook-events.ts`.

```ts
// scripts/hooks/checks/lint-write.core.ts
export const lintWrite: Check = {
  name: 'lint-write',
  tools: /^(Edit|Write|MultiEdit)$/u,
  // lints the written file and returns the report as context
```

This brings every rule's message, and the dantotsu it links, to the moment the shape is written. It lifts every lint-backed dantotsu at once, not only this one.

**Proof it can fail:** on 2026-11-15, a scratch copy of `AppShell.tsx` with `overflow-y-auto` added to `<main>`, fed to the hook as a PostToolUse Edit, returned in 1.085 s:

```text
[lint] The file just written breaks a rule the commit gate enforces. ...
apps/pragma/site/src/components/organisms/ScratchShell.tsx:70:7: A <main> that
scrolls is a second scroller inside a window that can still scroll. ...
See docs/dantotsus/the-shell-that-scrolled-inside-a-window-that-still-could.md.
[Error/borso(no-scroll-container-on-main)]
```

The unchanged `AppShell.tsx` returned nothing in 1.169 s. The TypeScript check carries its own tests in `scripts/hooks/checks/lint-write.core.test.ts`.

**Similar instances:** `grep -l 'eradication-paths: \[eslint-rules' docs/dantotsus/*.md` lists the dantotsus whose eradication is a custom rule. Each of them now speaks at the write. A dantotsu whose lesson no rule holds still reaches nobody at the write.
