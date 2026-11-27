---
date: 2026-10-08
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#145'
fix-commits: [7921a44c5c, 6de3d1804, 0b2eb43b1]
eradication-level: 1
eradication-paths: [apps/talos/site/src/lib/claude-code-address.core.ts, apps/talos/site/src/lib/claude-code-opener.adapter.ts]
time-to-detect: days
tags: [talos, claude-code, pwa]
zone: apps/talos/site/src/lib/claude-code-address.core.ts
---

# The link the app opened without its prompt

## User impact

In the Talos home-screen app on a phone, a long press on a todo then
« Discuter » opened Claude Code with an empty composer. Hugo reported it on
first use: « Le prompt arrive vide avec ma PWA. » The same link worked in a
desktop browser.

| | Seen | Expected |
| --- | --- | --- |
| « Discuter » from the home-screen app, 2026-10-08 | The Claude app opens with an empty composer | A new session prefilled with the todo |
| The same link tapped from the app after the first two fixes, 2026-10-24 | The Claude app opens on its session list, no new session, no prompt | A new session prefilled with the todo |

Only phones with the Claude app installed were affected. Desktop browsers
were not.

## Causal chain

- The Claude app opened with an empty composer.
  - The app received `https://claude.ai/code?repositories=…&environment=…&prompt=…`.
    `claude.ai/code` is a universal link, so on a phone with the app installed
    the operating system hands it to the app.
    - The app prefills only `code/new`, from `q` and `repo`. It ignores
      `prompt` on `code`.
      - `buildClaudeCodeAddress` wrote the web-only form:

        ```ts
        const CLAUDE_CODE_ADDRESS = 'https://claude.ai/code'; // the app reads code/new
        const parameters: [string, string][] = [['repositories', launch.repository]];
        parameters.push(['prompt', launch.prompt]); // the app reads q
        ```

        - Commit `f723bb1fd` (PR #145) wrote this line and, in the same
          commit, the `CONTRAT.md` section it follows: « The Message screen
          opens a Claude Code session on the web … The link is the one
          documented under "Pre-fill sessions" in the Claude Code web
          quickstart. »
          - The agent's only source was the web quickstart. The app's link
            reference, support.claude.com article 14898120, was not in its
            context.
- After the fix in PR #149, the app opened on its session list instead.
  - PR #149 kept `environment` on the app link and relied on a clipboard copy
    for "whatever the app drops".
    - The app drops the whole link when it carries `environment`. Hugo
      measured it on 2026-10-24 by tapping three links from Safari (recorded
      in the knowledge entry below).
      - PR #149 and then PR #194 were each written from documentation alone.
        The knowledge entry's own record says « no phone was available to tap
        the link ». PR #196 removed `environment` only after Hugo's taps.

## Root cause of occurrence

*Thought a `claude.ai/code` link is read by Claude Code on the web. Actually,
on a phone with the app installed, the Claude app reads it, prefills only
`code/new` from `q` and `repo`, and drops a link that carries `environment`.*
(Material)

The agent wrote the link from the one document in its context, the web
quickstart's « Pre-fill sessions ». The app's reference, article 14898120,
says the app opens `claude://code/new` and its https equivalent with `q` and
`repo` (read for
[`claude-code-links-open-in-the-app-on-a-phone`](../knowledge/claude-code-links-open-in-the-app-on-a-phone.md)).
The `environment` behaviour is documented nowhere and was learned only from
Hugo's taps.

The recurrence one step deeper is Method: a hosted session cannot tap a link,
and no step of the flow asked the operator to tap one on the preview before
merge. So each fix was checked against documents, not the reader.

## Detection failure causes

- **Typing:** the address was a plain string, so nothing typed which reader
  would open it.
- **Local validation:** a hosted session has no phone and no app, so the tap
  cannot be reproduced.
- **CI:** the tests pinned the address to the web format, so they protected
  the defect.
- **Review:** `CONTRAT.md` cited a real document, and the citation looked like
  proof.
- **Preview:** no step asked the operator to tap the link on a phone before
  merge, so production was the first tap, three times.

## Countermeasure

Commit `7921a44c5` (PR #149) moved the builder to
`https://claude.ai/code/new` with `repo` and `q`. Commit `6de3d1804` (PR #194)
used `claude://code/new` from the iOS home-screen app. Commit `0b2eb43b1`
(PR #196) dropped `environment` from the app link. Hugo's taps of 2026-10-24
verified the last form.

## Eradication

**Type:** structural impossibility (level 1), for the shapes measured.

**Reference:** commits `6de3d1804` and `0b2eb43b1`. Today
`buildClaudeCodeAddress` takes a typed `ClaudeCodeOpener` (`'app' | 'web'`),
chosen once by `detectClaudeCodeOpener` in
`claude-code-opener.adapter.ts`. Every Claude Code link in Talos goes through
it.

```ts
export type ClaudeCodeOpener = 'app' | 'web';
const CLAUDE_CODE_ADDRESS: Readonly<Record<ClaudeCodeOpener, string>> = {
  app: 'claude://code/new',
  web: 'https://claude.ai/code/new',
};
// …
if (launch.environmentId !== null && opener === 'web') {
  parameters.push(['environment', launch.environmentId]);
}
```

A caller cannot build a link without naming its reader, and cannot put
`environment` on an app link. The tests that assert `code/new`, `repo` and `q`
are a regression pin, not the mechanism.

**The gap:** the builder encodes only what has been measured. The knowledge
entry lists two behaviours still unverified (a link without `q`, and whether
the web serves `code/new` itself). A new parameter the app rejects would pass.

**Proposed:** when a change touches a link an external app reads, the PR's
before-merge block asks the operator to tap it on the preview from a phone.
That turns the reader's behaviour into the check, instead of documentation.

**Proof it can fail:** inferred, not re-run this session. Passing
`environment` for `opener === 'app'` is not expressible without editing the
builder, and reverting the route to `https://claude.ai/code` fails the
builder's tests.

**Similar instances:** `grep -rn "claude.ai/code\|claude://" apps --include=*.ts --include=*.tsx | grep -v test`
finds only the builder. The Message screen and the scan button were fixed with
it.
