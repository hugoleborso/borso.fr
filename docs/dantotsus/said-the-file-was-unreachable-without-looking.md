---
date: 2026-08-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#50'
fix-pr: '#51'
fix-commits: [8f609a7]
eradication-level: 2
time-to-detect: 25 minutes
tags: [harness, tooling, process, claude-md]
---

# Drew the logo by hand because I said the file was unreachable

## Symptom

The operator pasted their band's logo and asked for it on the PWA icons. The
reply was that a pasted image does not arrive as a file, so the mark was redrawn
by hand as SVG — two mirrored note shapes around a keyboard — rendered to PNG at
every icon size, committed, deployed, and offered back with a note explaining
the substitution.

> This is NOT the same logo. Just from the one I gave you
>
> NOOOO you did not reproduce it correctly AT ALL

## Root-cause chain

1. **Why was the logo redrawn?** Because the image was believed to be
   unavailable as bytes.
2. **Why was it believed unavailable?** A filesystem search for recently written
   image files found nothing: `find /tmp /home/user -maxdepth 4 -newermt … \(
   -name "*.png" -o -name "*.jpg" … \)` came back empty.
3. **Why did that search prove nothing?** It searched where a *download* would
   land. A pasted attachment is not downloaded anywhere; it rides in the
   conversation. The search tested one hypothesis about where the bytes might be
   and its failure was read as a general impossibility.
4. **Why was the conclusion not checked against the harness?** Because it felt
   like a platform fact rather than a guess. It was stated to the operator twice
   as a limitation — *"your pasted image never lands on my filesystem"* — with
   no probe behind it.
5. **Where were the bytes?** In the session transcript at
   `~/.claude/projects/<slug>/<session>.jsonl`, as a base64 `image` block on the
   user message. One `grep -c base64` on that file would have found it. Once
   extracted, the icons were cropped from the real artwork by measuring the
   blank rows between the mark and the wordmark.
6. **Why did this happen when the repository already documented it?** It did
   already document it.
   [`claude-code-session-attachments-on-disk.md`](../knowledge/claude-code-session-attachments-on-disk.md)
   was written after PR #11, where an agent told the operator to commit their own
   photos and the operator answered *"non TU commit ces fichiers toi-même"*. It
   gives both storage locations, the JSONL block shape, a decoder, and closes on
   the sentence: *"the agent's instinct is to assume the absence of a tool means
   the absence of a capability. It doesn't."* Three months later the same
   instinct produced the same answer, because a knowledge entry is only read by
   someone who already suspects it exists — and an agent certain of a limitation
   does not go looking for the file that disproves it.

**Root cause:** thought *"the tools I have cannot reach a pasted image"*,
actually *"the whole conversation, attachments included, is written to a JSONL
file on this disk, and one failed guess about where a file might be is not
evidence that it does not exist"*. Underneath that, the reason it recurred: a
capability documented only in prose is a capability an agent has to *suspect*
before it can find it, and a wrong certainty is precisely the state in which
nobody searches.

## Detection failure causes

- **Typing / linter / CI:** not applicable — nothing here can tell a faithful
  icon from an invented one; both are valid PNGs of the right size, and the new
  `check-pwa-assets.sh` gate passed on both.
- **Functional validation locally:** the icons were rendered, inspected and
  confirmed to be *legible at every size*, which is not the same question as
  whether they are the operator's logo.
- **Code review:** caught by the operator, at a glance, immediately.
- **PO / QA validation:** the substitution was disclosed in the reply, which is
  what an honest wrong answer looks like — disclosure is not verification.
- **Knowledge:** the layer that was supposed to catch this, and the reason this
  entry exists. `claude-code-session-attachments-on-disk.md` documented the
  capability, in detail, three months earlier, after the same mistake. It was
  never opened, because nothing in the moment suggested opening it: the agent
  was not looking for how to read an attachment, it had already concluded there
  was nothing to read.

## Countermeasure

- **Code:** commit `8f609a7` — every icon regenerated from the operator's own
  file, cropped to the mark by measuring the blank rows between it and the
  wordmark (rows 34–555, columns 39–793 of the source), the hand-drawn SVG
  deleted, and the trimmed artwork kept at `icons/pragma-logo.png` so the set
  can be regenerated without going back to a transcript.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the capability is now a command instead of a
belief)

**Reference:** [PR #51](https://github.com/hugoleborso/borso.fr/pull/51) ·
`scripts/session-attachments.sh` on this branch

```bash
scripts/session-attachments.sh list
#   attachment-0-user.jpg  image/jpeg  49108 bytes  (from user)
scripts/session-attachments.sh extract ./assets
```

It finds the newest transcript for the current repository — searching every
project folder that matches, because a session started from a subdirectory gets
its own — walks it for base64 `image` blocks, and lists or writes them with
their media type and size. Verified against this session: the extracted file is
byte-identical to the logo recovered by hand.

The point is not the script's fifty lines. It is that *"can I get at what the
human pasted"* now has a command that answers it, so the next agent runs the
command instead of reasoning about what the harness probably does. A capability
you can invoke cannot be argued away.

**Why this is not another knowledge entry.** Because that was tried. The
capability has been documented since PR #11, thoroughly and correctly, and it
did not stop the recurrence — a document only reaches an agent who suspects it
exists, and certainty is the state in which nobody searches.

So the eradication is the script, and the discoverability lever is one clause
inside CLAUDE.md's existing *Verify before asserting* rule rather than a section
of its own. The first draft did give it a section, and the operator pushed back
that it was disproportionate. They were right, and the reasoning behind the
draft was the real problem: *"knowledge failed, so escalate to CLAUDE.md"*
justifies moving every failed lesson into the one file every task reads, which
would turn it into the corpus. What generalises is not "pasted files are
reachable" but "a claim about your own harness is a hypothesis until a command
answers it" — and that rule was already there, one line up. The existing
knowledge entry stays as the explanation and now links the script.

**Sibling defects swept:** the same shape landed twice more in the same PR, both
recorded separately — a tool declared broken and believed for fourteen hours
([`two-audits-that-sent-no-touch-events.md`](./two-audits-that-sent-no-touch-events.md)),
and a background workflow declared dead on the strength of one shallow `find`,
which caused a duplicate run against the same working tree
([`docs/knowledge/two-agents-in-one-working-tree.md`](../knowledge/two-agents-in-one-working-tree.md)).
Three assertions of impossibility in one PR, none of them probed.

## See also

- [`docs/knowledge/claude-code-session-attachments-on-disk.md`](../knowledge/claude-code-session-attachments-on-disk.md)
  — the entry that already said all of this, in 2026-05, after the same mistake.
- [`two-audits-that-sent-no-touch-events.md`](./two-audits-that-sent-no-touch-events.md)
  — same PR: a tool declared unusable, believed for fourteen hours, working all
  along.
- [`lectured-without-reading-the-code.md`](./lectured-without-reading-the-code.md)
