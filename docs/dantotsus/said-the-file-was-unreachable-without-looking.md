---
date: 2026-08-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#50'
fix-commits: [8f609a79eb]
eradication-level: 5
eradication-paths: [scripts/session-attachments.sh, docs/knowledge/claude-code-session-attachments-on-disk.md]
time-to-detect: 25 minutes
tags: [harness, tooling, process, claude-md]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [lectured-without-reading-the-code]
---

# Drew the logo by hand because I said the file was unreachable

## User impact

The operator pasted their band's logo and asked for it on pragma's PWA icons.
They got a different mark, redrawn by hand as SVG (two mirrored note shapes
around a keyboard), rendered at every icon size, committed and deployed.

> This is NOT the same logo. Just from the one I gave you
>
> NOOOO you did not reproduce it correctly AT ALL

| | Seen | Expected |
| --- | --- | --- |
| pragma's home-screen icon | a hand-drawn approximation | the band's pasted logo |

## Causal chain

- The icons showed a hand-drawn mark.
  - The agent drew `apps/pragma/site/public/icons/pragma-mark.svg` and rendered
    it to every PNG size.
    - The agent told the operator, twice, *"your pasted image never lands on my
      filesystem"*.
      - A search for recent image files came back empty:
        `find /tmp /home/user -maxdepth 4 -newermt … \( -name "*.png" -o -name "*.jpg" … \)`.
        - The search looked where a download would land. A pasted attachment
          rides in the conversation, written to
          `~/.claude/projects/<slug>/<session>.jsonl` as a base64 `image` block.
      - The agent read the empty search as a platform limit.
        - `docs/knowledge/claude-code-session-attachments-on-disk.md`, written
          after PR #11 for the same mistake, was not in its context. The
          knowledge hook prints it only on commands matching `\.claude/uploads`
          or `session-attachments\.sh`, and the `find` matched neither.

## Root cause of occurrence

*Thought "the tools I have cannot reach a pasted image", actually the whole
conversation, attachments included, is written to a JSONL file on this disk,
and one failed guess about where a file might be is not evidence that it does
not exist.* (Material)

The writer was an agent. The document that held the answer existed, and closed
on *"the agent's instinct is to assume the absence of a tool means the absence
of a capability. It doesn't."* It was absent from the agent's context at the
moment of the claim, because its trigger fires only once the agent already
suspects the capability. A wrong certainty is the state in which nobody
searches.

## Detection failure causes

- **CI:** `check-pwa-assets.sh` checks sizes and formats. A faithful icon and an
  invented one are both valid PNGs.
- **Hooks:** `no-hand-drawn-art` (added 2026-11-27, `scripts/hooks/checks/no-hand-drawn-art.core.ts`)
  refuses SVG path data without `@AssetSource`, but only under
  `apps/*/site/src/`. This drawing lived in `site/public/`, so it would still
  pass today.
- **Local validation:** the icons were checked for legibility at every size,
  not for being the operator's logo.
- **QA:** the reply disclosed the substitution. Disclosure is not verification.
- **Knowledge:** described in the chain. The trigger fires on the command that
  uses the capability, not on the probe that concludes it is missing.

## Countermeasure

8f609a79e regenerates every icon from the operator's own file, cropped to the
mark by measuring the blank rows between it and the wordmark (rows 34 to 555,
columns 39 to 793). The hand-drawn SVGs are deleted, and the trimmed artwork is
kept at `apps/pragma/site/public/icons/pragma-logo.png`.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit 8f609a79e, `scripts/session-attachments.sh` from
[PR #51](https://github.com/hugoleborso/borso.fr/pull/51).

```bash
scripts/session-attachments.sh list
#   attachment-0-user.jpg  image/jpeg  49108 bytes  (from user)
scripts/session-attachments.sh extract ./assets
```

What holds today:

- `scripts/session-attachments.sh` finds the newest transcript for the
  repository, walks it for base64 `image` blocks, and lists or extracts them.
  Verified on the 2026-08-15 session: the extracted file was byte-identical to
  the logo recovered by hand.
- The knowledge entry now opens on the script, and CLAUDE.md's *Verify before
  asserting* rule covers claims about the harness.

Both reach only an agent who already suspects the capability. The script is a
command nobody runs while certain there is nothing to read, and its knowledge
trigger repeats the flaw that let this recur.

**Proposed:** fire where the false certainty forms. Either add a trigger to
`docs/knowledge/claude-code-session-attachments-on-disk.md` on the image-search
`find` shape quoted above, which the knowledge hook already supports, or add a
check under `scripts/hooks/checks/` that prints
`scripts/session-attachments.sh list` when the operator's prompt carries an
image block. No `UserPromptSubmit` hook exists in `.claude/settings.json` today,
and whether its payload carries image blocks is unverified. Separately, widen
`no-hand-drawn-art` from `site/src/` to `site/public/`, so a drawn substitute
for a supplied asset is refused at write time. None of this exists yet.

**Proof it can fail:** not run.

**Similar instances:** the same PR asserted two more impossibilities without a
probe:
[`two-audits-that-sent-no-touch-events.md`](./two-audits-that-sent-no-touch-events.md)
and [`two-agents-in-one-working-tree.md`](../knowledge/two-agents-in-one-working-tree.md).
