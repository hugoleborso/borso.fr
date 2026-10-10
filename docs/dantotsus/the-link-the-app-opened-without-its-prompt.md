---
date: 2026-10-08
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#149'
fix-pr: '#149'
fix-commits: [7921a44c5c]
eradication-level: 4
eradication-paths: [apps/talos/site/src/lib/claude-code-address.core.ts]
time-to-detect: days
tags: [talos, claude-code, pwa]
zone: apps/talos/site/src/lib/claude-code-address.core.ts
---

# The link the app opened without its prompt

## Symptom

In the Talos home-screen app, a long press on a todo then « Discuter » opened Claude Code with an empty composer. Hugo: « Le prompt arrive vide avec ma PWA. » The link itself was correct for a browser: `https://claude.ai/code?repositories=…&environment=…&prompt=…`.

## Root-cause chain

1. **Why was the composer empty?** The link did not open Claude Code on the web. It opened the Claude app, which does not read `prompt` on the `code` route.
2. **Why did the app open it?** `https://claude.ai/code/...` is a universal link. With the app installed, the phone hands it to the app.
3. **Why was the link written for the web only?** `CONTRAT.md` specified it from one document, the web quickstart's « Pre-fill sessions ». The app's own link reference (`code/new`, `q`, `repo`) is a support article nobody had looked for.
4. **Why did nobody look for it?** The person the link serves reads it on a phone, and every check of the link (unit tests, the CONTRAT) was written and run from a desktop browser's point of view.

**Root cause:** thought a `claude.ai/code` link is read by Claude Code on the web; actually, on a phone with the app installed, the Claude app reads it, and it prefills only `code/new` with `q` and `repo`.

## Detection failure causes

- **Typing / linter:** the address is a string; nothing types the reader.
- **Functional validation locally:** a hosted session has no phone and no app, so the tap cannot be reproduced.
- **CI:** the tests pinned the address to the web format, so they protected the defect.
- **Code review:** the CONTRAT cited a real document, and the citation looked like proof.
- **Production:** Hugo saw it on first use. The first fix in PR #149 (commit `6f0a981`) still guessed at the cause, adding a clipboard fallback, until Hugo named the surface.

## Countermeasure

- **Code:** commit `4794511`, squashed as [`7921a44`](https://github.com/hugoleborso/borso.fr/commit/7921a44c5c2c24aa796ba4cedf322b7610f1d780): the single address builder now writes `https://claude.ai/code/new?repo=…&environment=…&q=…`, the route and names both readers accept. The clipboard copy from `6f0a981` stays as the fallback for whatever the app drops, such as the environment.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — detection)

**Reference:** [PR #149](https://github.com/hugoleborso/borso.fr/pull/149) · commits [`7921a44`](https://github.com/hugoleborso/borso.fr/commit/7921a44c5c2c24aa796ba4cedf322b7610f1d780)

**The actual fix:**

```diff
-const CLAUDE_CODE_ADDRESS = 'https://claude.ai/code';
+const CLAUDE_CODE_ADDRESS = 'https://claude.ai/code/new';
-  const parameters: [string, string][] = [['repositories', launch.repository]];
+  const parameters: [string, string][] = [['repo', launch.repository]];
-  parameters.push(['prompt', launch.prompt]);
+  parameters.push(['q', launch.prompt]);
```

Every Claude Code link in the app goes through `buildClaudeCodeAddress` in `apps/talos/site/src/lib/claude-code-address.core.ts`, and its tests, `MessageComposer.test.tsx` and `App.test.tsx`, now assert `code/new`, `repo` and `q`. Going back to the web-only form fails three suites. The tests cannot prove what an app does with the link. The reference for that is [`claude-code-links-open-in-the-app-on-a-phone.md`](../knowledge/claude-code-links-open-in-the-app-on-a-phone.md), which the `CONTRAT.md` section on messages now cites beside the web quickstart.

**Sibling defects swept:** the Message screen and the scan button built the same web-only link; both go through the same builder and were fixed by the same commit.

## See also

- [`claude-code-links-open-in-the-app-on-a-phone.md`](../knowledge/claude-code-links-open-in-the-app-on-a-phone.md)
