---
name: dantotsu
description: Use when the user asks for a Dantotsu, root-cause analysis (RCA), five-whys, post-mortem of a defect, or "lean quality investigation" — including the explicit `/dantotsu` invocation. Walks the seven Dantotsu steps and produces a Markdown entry under `docs/dantotsus/`. CRITICAL — eradication is non-optional and must land code, not docs alone. The skill has a hard rule: every dantotsu finishes with at least one of (a) a structural change that makes the defect impossible to reintroduce, (b) a DevX check (linter, type guard, pre-commit hook) that catches the misconception, (c) a vendor patch in `patches/` plus a flag for the human to open the upstream PR, OR — only if none of the above is feasible — (d) a knowledge entry under `docs/knowledge/`. Each dantotsu links the commit hash, PR, and code diff that fixed it. Agent never opens PRs against repos outside `hugoleborso/*`. Read the standard at `.claude/skills/dantotsu/standard.md` before facilitating one.
---

# Dantotsu — radical quality through root-cause analysis

This skill implements the **Dantotsu standard** kept verbatim at
[`standard.md`](./standard.md). Read it before facilitating one — it
captures the spirit (intent, typical mistakes, key challenges,
reframes) that this checklist alone can't.

> **The intent:** *Inspire every developer to care about quality by
> fostering a deep understanding of their system — from business
> modeling to the lines of code they write every day.*

A Dantotsu is a Lean exercise where a developer (with a coach, or
this skill in coach role) deeply investigates ONE defect to:

1. Understand it from the user's perspective.
2. Trace the causal chain through the system.
3. Find the *misconception* — the technical or business
   misunderstanding — that made the bad code feel right.
4. Find why the defect wasn't caught earlier.
5. Produce a minimal countermeasure that addresses the misconception,
   not just the symptom.
6. **Eradicate the defect-class — code-level, not docs alone.**
7. Spread the lesson so the team's mental model improves.

**The goal is NOT to fill out a form.** It is for the developer to
deepen their understanding of the system — and for the codebase to
end up structurally unable to host the same defect again.

## When to facilitate one

- The user describes a defect (production, staging, local) and wants
  to investigate.
- The user says any of: "let's do a Dantotsu" / "RCA" / "five whys" /
  "post-mortem" / "/dantotsu".
- The user pastes an error or stack trace and asks "what went wrong here".
- A PR just fixed a non-trivial bug — the [`/after-task-dantotsus`](../after-task-dantotsus/SKILL.md)
  skill calls this one once per surviving subject.

## When NOT to

- Routine fixes where the cause is obvious (typo, missing import) and
  no analysis was asked for.
- Feature work or refactors with no defect involved.
- Documentation-only proposals where the underlying code is fine.

## The seven steps

For each step's prompts and traps, see
[`standard.md` §How-to](./standard.md#how-to). What follows is the
agent-shaped subset.

### 0. Pick a defect

One specific instance, reproducible (or with artefacts), original
developer reachable (or you proceed hypothetically and say so).

If the feature is no longer used, the right fix is to **delete the
code**. Code that doesn't exist has no bugs.

### 1. Identify the user-facing defect

Frame the symptom from the **user's perspective**. Not "DB insert
threw `ConstraintViolation`" — "the user clicked Save and their
changes were lost, with a red banner".

Capture observed-vs-expected side by side, with screenshot/error
verbatim. If the bug is already fixed, reproduce against the parent
commit.

### 2. Identify the causal chain

Trace the symptom backwards step-by-step until the **first point
where the behaviour diverged from intent** — the faulty line.
Push through external dependencies if needed.

Include 5–20 lines of context, not more.

### 3. Identify the root cause of occurrence

The faulty line exists because the developer believed something
that wasn't true. Find that belief.

**Frame:** *"The developer thought ___, but actually ___."*

**Validate:** *"If the developer had known the 'actually' part,
would they have written correct code on the first try?"* → Yes ⇒
root cause found. No ⇒ keep digging.

Push past shallow stops:

| Shallow | Push to |
| --- | --- |
| "I wasn't paying attention." | Why was the code shaped such that "not paying attention" would break it? |
| "I forgot to do X." | Why was X required? Could the API design make X mandatory by construction? |
| "Lack of knowledge of iframes." | *Specifically what* did they think was true? ("I thought `origin` was the URL; it's actually scheme + hostname + port.") |

Look especially at **business-modelling misunderstandings**, not
just technical ones — the deepest defects come from misunderstanding
what the user actually does.

### 4. Identify detection failure causes

For each defence-in-depth layer that should have caught the defect
but didn't, name the specific reason. Walk these in firing order:

- Type system
- Linter / static analysis
- Functional validation locally
- CI (tests, type-check, lint, build)
- Code review
- PO / QA validation
- Staging monitoring
- Production monitoring / alerting

Avoid "there was no test" as a terminal answer — push to *why* there
was no test or why the test didn't cover the path.

### 5. Countermeasure

The minimal change that restores correctness AND demonstrates the
developer understood the cause. Removes the misconception; doesn't
wrap the failing path in `if` and walk away.

### 6. Eradication — non-optional, code-level

**This step ships code.** The skill rejects "captured as follow-up"
or "knowledge entry only" except as the last-resort floor.

Pick the highest level of the ladder you can reach (preferred order,
top is best):

1. **Structural impossibility.** Change types, API shapes, or
   construct surfaces so the misconception cannot be expressed in
   code. Example: instead of accepting `unit: string` on a budget,
   take only `amountUsd: number` and hardcode `'USD'` internally.
   Now the EUR mistake is unspeakable.
2. **DevX check.** A linter rule (Biome / GritQL plugin), a custom
   `pre-commit` / `pre-push` script, an `actionlint` config, or a
   typescript type guard that rejects the misconception at
   compile/lint/commit time. Catches the next instance before it
   ships.
3. **Vendor patch.** If the bug is in an open-source library and not
   misuse on our side, drop a `.patch` file under `patches/<lib>/`
   and write a `patches/<lib>/<short-name>.md` with the
   upstream-PR body the human will paste. **The agent never opens
   PRs against repos outside `hugoleborso/*` — that's a hard rule.**
   The patch is applied to our `node_modules` via `pnpm patch` so
   our build is correct meanwhile.
4. **Detection improvement.** A CloudWatch alarm, a synth-time test,
   an integration test that exercises the previously-untested path.
   Catches the next instance after it ships, before users see it.
5. **Knowledge entry.** A new file under `docs/knowledge/` — only
   if 1–4 are genuinely impossible. Knowledge alone is *not enough*
   for a Dantotsu; pure-knowledge subjects belong in
   `docs/knowledge/` directly, not in `docs/dantotsus/`.

For each item picked, **include the actual diff or commit
reference** in the entry — not a placeholder. The dantotsu file
links the commit hash, PR, and a relative-path diff snippet that
shows what changed.

If a Dantotsu's "highest level reached" is (5) alone, it's almost
always misclassified. Re-read step 3 — the misconception is usually
expressible in code if you push hard enough.

### 7. Spread the lesson

- Title the entry to **spark curiosity**, not the user-story name.
- Cross-link to other entries when chains overlap.
- If a coaching opportunity exists (a developer would benefit from
  walking through the chain), name it.

## Output — what to write

Drop a Markdown file at `docs/dantotsus/<slug>.md`. Use
[`docs/dantotsus/_template.md`](../../../docs/dantotsus/_template.md)
as the starting point — it has the YAML frontmatter and section
shape pre-filled.

Frontmatter MUST include the eradication's commit hash and PR (or
"this PR" with the PR-creation command spelled out for the operator).
Without that link the dantotsu doesn't qualify.

## Hard rules (the skill enforces these)

- **No issue creation as a substitute for an eradication commit.**
  Issues drift; the loop dies. The dev's sole and last goal between
  PRs is shipping the eradications.
- **No "captured as follow-up; not implemented yet"** in the
  Eradication section. Either implement it or pick a lower level that
  you can implement now.
- **The agent never opens PRs against repositories outside
  `hugoleborso/*`.** For upstream patches, produce
  `patches/<lib>/<short-name>.{patch,md}` and stop there. The
  human chooses whether to send the patch upstream.
- **Eradication entries link the commit hash + PR + a diff snippet.**
  No vague pointers; the reader can verify the fix landed.

## Typical mistakes to avoid

(Full list at [`standard.md` §Typical mistakes](./standard.md#typical-mistakes).)

| Mistake | Consequence |
| --- | --- |
| Stop at "filling the form" | Bureaucratic; developer thinks it's a waste of time. |
| Accept "it was just a careless mistake" | No learning. Same defect class recurs. |
| User-story name as title | Lesson doesn't spread beyond the original team. |
| Frame technically, not from the user | Developer doesn't connect their code to user value. |
| Investigate only the local bug | Latent siblings stay in the codebase. |
| Vague root cause ("lack of knowledge of X") | Doesn't bind to day-to-day code. |
| **Skip eradication or defer to a follow-up** | Loop dies. The defect class survives. |
| Lots of unnecessary context | Verbose entries don't get re-read. |
| Facilitate like a courtroom | Developer avoids future sessions. |

## Reframes — read these before facilitating

| Misconception | Reframe |
| --- | --- |
| The developer should do this alone. | The original reasoning is the thing under examination. Bring a second pair of eyes. |
| We're producing Dantotsu sheets. | We're sparking conversations about defects to surface tacit knowledge. |
| A good Dantotsu fills every field. | A good Dantotsu deepens the developer's mental model AND ships an eradication. |
| I do this when there's a major prod bug. | Maintain a regular rhythm to raise the level of play. |
| Mastery = knowing every framework tidbit. | Mastery is the quality of mental models about business, system structure, and failure modes. |

(Full list at [`standard.md` §Reframes](./standard.md#reframes).)

## In this repo

- **`docs/dantotsus/`** — RCAs with eradication commits. Every entry
  has frontmatter linking commit + PR + diff.
- **`docs/knowledge/`** — pure reference docs (vendor quirks, CLI
  contracts, conventions). Not Dantotsus — no causal chain, no
  eradication. Use this folder when the fix is "operator awareness"
  with no possible code lever.
- **`docs/dantotsus/_template.md`** — copy this when starting a new
  entry.
- **CLAUDE.md's Self-improvement loop** rule: when a PR merges, run
  [`/after-task-dantotsus`](../after-task-dantotsus/SKILL.md) →
  produces one Dantotsu per real defect (with eradication shipped)
  and one Knowledge entry per vendor surprise → opens the follow-up
  PR with the `kaizen` label.
