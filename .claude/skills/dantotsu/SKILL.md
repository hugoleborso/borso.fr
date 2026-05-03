---
name: dantotsu
description: Use when the user asks for a Dantotsu, root-cause analysis (RCA), five-whys, post-mortem of a defect, or "lean quality investigation" — including the explicit `/dantotsu` invocation. Walks through the seven-step Dantotsu process (user-facing defect → causal chain → root cause of occurrence → detection failure causes → countermeasure → eradication → spread the lesson) and produces a Markdown entry suitable for `docs/knowledge/`. Use whenever a PR fixed something hard enough that the **Self-improvement loop** rule in CLAUDE.md asks for a knowledge entry. Do NOT use for routine bug fixes where the cause is obvious and no analysis was requested.
---

# Dantotsu — radical quality through root-cause analysis

A Dantotsu is a Lean exercise where a developer (with a coach) deeply investigates ONE defect to:

1. Understand it from the user's perspective.
2. Trace the causal chain through the system.
3. Find the *misconception* — the technical or business misunderstanding — that made the bad code feel right.
4. Find why the defect wasn't caught earlier.
5. Produce a minimal countermeasure that addresses the misconception, not just the symptom.
6. Eradicate similar latent defects elsewhere.
7. Spread the lesson so the team's mental model improves.

**The goal is NOT to fill out a form.** It is for the developer to deepen their understanding of the system. A Dantotsu succeeds when the developer can articulate what they thought was true, what's actually true, and how their mental model has shifted.

## When to facilitate one

- The user describes a defect (production, staging, local) and wants to investigate.
- The user says any of: "let's do a Dantotsu" / "RCA" / "five whys" / "post-mortem" / "/dantotsu".
- The user pastes an error or stack trace and asks "what went wrong here".
- A PR just fixed a non-trivial bug → capture the lesson per CLAUDE.md's **Self-improvement loop** rule.

## When NOT to

- Routine fixes where the cause is obvious (typo, missing import) and no analysis was asked for. A short commit message is enough.
- Feature work or refactors with no defect involved.

## The seven steps

### 0. Pick a defect

Before starting, confirm:

- **One specific defect**, not "a class of bugs". The eradication step (#6) sweeps siblings.
- **The user-facing symptom is identified** — error message, screenshot, observed-vs-expected.
- **Reproducible**, OR you have artefacts (logs, error, ticket).
- **Original developer reachable** — or the user is OK with hypothetical reasoning for the "what did you think" step.

If the defect is too old (no one remembers), flag it and ask whether to proceed hypothetically or pick a fresher one. Old defects mean weak conclusions.

If the feature is no longer used, the right fix is to **delete the code**. Code that doesn't exist has no bugs. Suggest this before investing in analysis.

### 1. Identify the user-facing defect

Frame the symptom from the **user's perspective**, not the developer's.

- ✅ "When the user clicks Save, a red banner appears and their changes are lost."
- ❌ "DB insert query throws ConstraintViolation."

Capture observed-vs-expected side by side. Screenshot if possible. If the bug is already fixed, reproduce it by reverting the fix or checking out the parent commit.

### 2. Identify the causal chain

Trace the sequence of events from the user's symptom backwards into the system, one step at a time, until you hit the **first point where the behaviour diverged from intent** — the faulty line.

Each step is "X happened *because* Y". Push through external dependencies if needed (read the source of the library you're calling).

```
User sees red banner
→ frontend received 500 from POST /items
→ backend threw uncaught exception during INSERT
→ DB rejected the row: NOT NULL violation on `name`
→ application code passed `name: undefined` to the ORM ← faulty line
```

In the Dantotsu, include the faulty line of code (5–20 lines of context max). Annotate the chain inline.

### 3. Identify the root cause of occurrence

The hardest and most valuable step. The faulty line exists because the developer believed something that wasn't true. Find that belief.

**Frame:** *"The developer thought ___, but actually ___."*

**Validate:** *"If the developer had known the 'actually' part, would they have written correct code on the first try?"*  → Yes ⇒ root cause found. No ⇒ keep digging.

**Common shallow stops to push past:**

| Shallow | Push to |
| --- | --- |
| "I wasn't paying attention." | Why was the code shaped such that "not paying attention" would break it? |
| "I forgot to do X." | Why was X required? Could the API design make X mandatory by construction? |
| "Lack of knowledge of iframes." | *Specifically what* did they think was true? ("I thought `origin` was the URL; it's actually scheme + hostname + port.") |

**Useful prompts for the developer:**

- "When you wrote this line, what did you think would happen?"
- "How would you make sure this can't happen again? Imagine you're flying a plane."
- "What makes this code error-prone or fragile?"
- "Is this a known mental-model gap (concurrency, type variance, eventual consistency, …)?"

Look especially at **business-modelling misunderstandings**, not just technical ones. The deepest defects come from misunderstanding what the user actually does. Stay specific: a vague root cause ("didn't know iframes well") doesn't bind to day-to-day code; a sharp one ("thought `origin` is a URL, it's a scheme+hostname+port") immediately changes how the developer reads similar code.

### 4. Identify detection failure causes

For each layer that *should* have caught the defect but didn't, capture WHY. Walk these in firing order:

- Type system (typing, generics, branded types, exhaustiveness)
- Linter / static analysis
- Functional validation locally (developer running it)
- CI (tests, type-check, lint, build)
- Code review (what would the reviewer have needed to see?)
- PO / QA validation
- Staging monitoring
- Production monitoring / alerting

**Avoid these traps:**

- ❌ "There was no test." — true for most defects. Why isn't there a test? Could the surface make tests easier to write or unnecessary?
- ❌ "There was no manual check." — manual checks don't scale; this restates the problem.

**Aim for things like:**

- "The type signature accepts `string | undefined`, so the type-checker had no way to know `name` shouldn't be undefined here."
- "The integration test setup always seeds `name`; the empty-name path is unreachable in tests."
- "Production alerts on 500s overall, but not on this specific endpoint."

### 5. Countermeasure

The minimal change that restores correctness AND demonstrates the developer understood the cause.

A **good** countermeasure:

- Removes the misconception (e.g. types the field as required so misuse becomes impossible).
- Cleans up adjacent code if it was contributing to the confusion.
- Simplifies — fewer states, fewer branches, fewer ways to be wrong.

A **bad** countermeasure:

- Adds a defensive `if` around the failing path while leaving the misconception intact.
- Patches the symptom but doesn't change why the next developer would make the same mistake.

Show the diff (or pseudo-diff) and explain why it addresses *the root cause*, specifically.

### 6. Eradication

Fixing the one site is necessary but not sufficient. Look for:

- **Sibling defects** — other places in the codebase where the same misconception likely lurks. Search them out and fix.
- **Tooling that prevents the misconception:**
  - Linter rule (built-in or custom GritQL).
  - Type-system pattern (branded types, exhaustive switches, `never` returns).
  - Schema validation at the boundary.
  - Build-time check.
- **Detection improvements:**
  - Test that exercises the previously-untested path.
  - Alert that fires before the user sees the defect.
- **Knowledge propagation:**
  - Tell the Dantotsu story to anyone who might make the same mistake.
  - Add a file under `docs/knowledge/` so the lesson outlives the conversation.

For each item, decide: do it now, or capture as a follow-up issue/PR? Don't end the Dantotsu without a plan for each.

### 7. Spread the lesson

- Track recurring patterns over time (Weak Point Management): if three Dantotsus converge on "we're confused about timezones", that's a signal to invest in a timezone primer / linter / convention.
- Coach the developer on the gesture so they can run their own Dantotsus with progressively less support.
- Pick a title that **sparks curiosity**, not the user-story name. The title is what makes the lesson spread beyond the original team.

## Output — what to write

Produce the result as a Markdown file ready to drop into `docs/knowledge/<slug>.md`. The slug template lives in `docs/knowledge/README.md`. Use this shape:

```md
# <Title — sparks curiosity, hints at the lesson, NOT the user-story name>

## Symptom
<from the user's perspective, with screenshot/error if available>

## Root-cause chain
1. **Why?** <step-1 question>
   <answer>
2. **Why?** <step-2 question>
   <answer>
…
**Root cause:** <one-sentence misconception, in "thought X, actually Y" form>

## Detection failure causes
- **<layer>:** <why this layer didn't catch it>
- …

## Countermeasure
- **Code:** <commit sha / pseudo-diff + why this addresses the root cause specifically>
- **Operator action:** <if anything is required outside the codebase>

## Eradication
- <sibling latent defects swept (with paths/commits)>
- <tooling change applied>
- <knowledge sharing planned or done>
```

If the analysis stays in conversation only (no file written), still walk through every step — don't skip ahead to the fix.

## Typical mistakes to avoid

| Mistake | Consequence |
| --- | --- |
| Let the developer write the Dantotsu alone | They can't spot their own misconceptions. The exercise feels pointless and they stop. |
| Stop at "filling the form" | Bureaucratic; developer thinks it's a waste of time. |
| Accept "it was just a careless mistake" as the cause | No learning. Same defect class recurs. |
| User-story name as title | Only the original team reads it; the lesson doesn't spread. |
| Frame the issue technically, not from the user | Developer doesn't connect their code to user value. |
| Investigate only the local bug | Latent sibling defects stay in the codebase. |
| Limit analysis to technical aspects | Business-modelling defects — usually the deepest — get missed. |
| Describe the cause as "the code that should have been written" | Stays at the line-replacement level. No pattern awareness. |
| Vague root cause ("lack of knowledge of X") | Doesn't bind to day-to-day code. Be specific: "I thought A, it's actually B." |
| Lots of unnecessary context | Verbose Dantotsus don't get re-read. Be sharp. |
| Facilitate like a courtroom | Developer will avoid future sessions. Coach with curiosity, not judgment. |

## Reframes — read these before facilitating

- **"The developer should do this alone."** → No. The point is to uncover reasoning errors, and the original reasoning is the thing under examination. Bring a second pair of eyes.
- **"We're producing Dantotsu sheets."** → No. We're sparking conversations about defects to surface tacit knowledge.
- **"A good Dantotsu fills every field."** → No. A good Dantotsu deepens the developer's mental model.
- **"I do this when there's a major prod bug."** → No. Maintain a regular rhythm to raise the level of play, not just react to crises.
- **"Mastery = knowing every framework tidbit."** → No. Mastery is the quality of mental models about business, system structure, and failure modes.

## In this repo

- `docs/knowledge/` is the living archive of Dantotsus — one per file. CLAUDE.md's **Self-improvement loop** rule says: when a PR uncovers a new defect class, capture it there.
- For trivial bugs that don't merit the full ceremony, a one-line note in the fix commit is enough.
- For anything that bit hard or could bite again — even cross-account quirks like `aws cloudfront get-function`'s positional outfile, or vendor surprises like CloudFront Functions runtime 2.0 — run the full Dantotsu.

The cost of writing one ~40-line file is far smaller than the cost of the next session re-discovering the same trap.
