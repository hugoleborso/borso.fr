---
date: 2026-05-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/24
fix-pr: https://github.com/hugoleborso/borso.fr/pull/<TBD>
fix-commits: []
eradication-level: 5
time-to-detect: minutes
tags: [harness, skill, conception, code-quality, claude-md]
---

# Lectured for four turns on CloudFront behaviour before reading the file

## Symptom

The session opened on a debugging question — _"is the JPEG-on-404
mapping in `StaticSite` the cause of `/r/<slug>` direct-nav not
loading the SPA?"_ — and the agent answered for four consecutive
turns with a confident narrative about CloudFront `errorResponses`,
S3 `NoSuchKey`, OAC `ListBucket`, and content-type rewriting —
including a specific citation, `infra/cdk/src/internal/static-site.ts:166`.

The user pulled back twice:

> _« Donc en fait le problème, que tu aurais pu décrire en une
> ligne, c'est que le code renvoyé par cloud front à la place
> d'une 404 est 200 quand on sert cette image. »_

> _« Est-ce que c'est ça ? »_

Only then did the agent open the file. The cited path was wrong on
two counts: the file lives under `infra/cdk/src/constructs/`, not
`internal/`; and the relevant block is at line 173, not 166. The
agent's narrative about the response status also turned out to be
wrong — the current config returns 404 with the JPEG body, not 200
as the user assumed and the agent confirmed. The eventual fix
needed both a Read and a fresh explanation, after the agent had
already burned the user's attention on a synthetic CloudFront
lecture.

Same misconception bit again two turns later, on a different
artefact: the existing
`docs/knowledge/github-mcp-pr-body-sanitizer.md` entry asserted
that the GitHub MCP sanitizer strips `<details>` and wraps
`![alt](url)` images in backticks. PR #26's stored body — opened
from the same harness — contains literal `<details>...</details>`
blocks and renders `![Catalog](https://…)` images correctly.
Reviewer comment:

> _« Not true, and I want my details. Test your hypotheses before
> saying things like this. »_

## Root-cause chain

1. **Why did the agent answer four turns without opening the file?**
   The mental model of CloudFront `errorResponses` ↔ S3 ↔ OAC felt
   complete enough to explain without verification. Confidence was
   sourced from prior corpus exposure, not from this repo's actual
   `static-site.ts`.
2. **Why did the agent cite a specific `file:line` it had not read?**
   Citing a path lent the narrative the _shape_ of a verified
   answer ("look, I'm pointing at the code") without paying the
   verification cost. The line number was hallucinated to match
   the shape.
3. **Why didn't the existing CLAUDE.md _"Verify before asserting"_
   rule prevent this?**
   The rule covers the _general_ failure mode but doesn't bind a
   verifiable artefact to the speech act. _Verify before asserting_
   reads as advice; the agent rationalised the lecture as _general_
   knowledge (CloudFront docs), not a _claim about the repo_.
4. **Why did the same misconception bite again at the sanitiser
   knowledge entry?**
   That entry was written in a previous session under the same
   pattern — three asserted patterns ("`<details>` stripped",
   "`![]()` wrapped in backticks", "pseudo-HTML stripped") with no
   round-trip verification recorded. The reviewer's _« Not true »_
   reproduces the present session's defect at a different timescale.

**Root cause:** _thought_ "I understand CloudFront / I understand
the MCP sanitizer", _actually_ both narratives were memorised
priors mapped onto a specific surface (this repo's `static-site.ts`,
this harness's MCP server). Without a procedural anchor that binds
_claim about a specific artefact_ → _the artefact was Read this
session_, the agent rationalises priors as repo knowledge.

## Detection failure causes

- **CLAUDE.md _Tone & rigor_ rule** — present, but worded as
  general advice ("Don't restate from memory — paste the relevant
  source") that the agent rounded down to _paste sources when
  asked_, not _before_ speaking.
- **Linter / type guard** — N/A; the false claims live in chat
  output, not in code.
- **Functional validation** — N/A.
- **Self-review** — the agent's internal check was _"does this
  narrative cohere?"_ not _"did I open the file the narrative
  describes?"_. Coherence is cheap; verification has a cost the
  agent skipped.

## Countermeasure

The user's two pull-backs forced the eventual Read. The cited
`<file>:<line>` was corrected in the chat. The sanitiser knowledge
entry was rewritten to document only what survives a round-trip
verification and to name PR #26 as the control sample.

- **Code:** commit [`2a4ecfc`](https://github.com/hugoleborso/borso.fr/commit/2a4ecfc) —
  `docs/knowledge/github-mcp-pr-body-sanitizer.md` rewritten with
  an explicit verification procedure (round-trip on a draft PR or
  inspect a recent PR known to render the pattern) and the
  unverifiable claims removed.

## Eradication (mandatory — code-level)

**Type:** knowledge addition (level 5 — knowledge) — tightening
CLAUDE.md's _Tone & rigor_ section so the rule binds a verifiable
artefact (a Read or Grep call **this session**) to any claim that
references a specific repo file. The level-2 alternative
considered (a hook that scans agent output for `<path>:<line>`
and rejects unverified references) was rejected: hooks don't see
agent chat output in this harness; only tool-input and
tool-output. The corpus of sibling dantotsus (see _Sibling
defects swept_ below) is the reminder that the failure mode is
recurring, not isolated.

**Reference:** [PR #<TBD>](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-24) ·
this kaizen PR.

**The actual fix:**

```diff
 ## Tone & rigor

 - **No invented numbers.** If you don't know a price, latency, capacity, or throughput, say so — or pull it from `aws … get-…`, the AWS pricing pages, or Cost Explorer. Never round to a memorable figure and pass it off as known.
-- **Verify before asserting.** When a claim depends on the state of the repo or live AWS, check it. The branch you're on can be far behind `main`; fetch and confirm. Don't restate from memory — paste the relevant source.
+- **Verify before asserting — bind the claim to an artefact.** If your answer describes a specific file, function, line, or AWS resource, the artefact must have been Read / Grep'd / `aws … get-…`'d **this session** before you describe it. Citing `<path>:<line>` without that prior tool call is a fabrication, even if the narrative is otherwise correct. *"I think CloudFront returns X here"* without an open Read on the file is the failure mode; *"`infra/cdk/src/constructs/static-site.ts:173` returns X"* without a prior Read is worse, because the path lends false authority. The branch you're on can be far behind `main`; fetch and confirm. Don't restate from memory — paste the relevant source.
```

**Sibling defects swept:** the same family — claim made before
the verifying tool was called — already has dedicated entries
under different surfaces:

- [`described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md) — visual-validation layer (screenshots described from the agent's hypothesis, not the bytes).
- [`believed-the-bundle-readme-not-the-live-package-json.md`](./believed-the-bundle-readme-not-the-live-package-json.md) — vendor-docs layer (README believed over the lockfile's actual version).
- [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) — library-availability layer (custom code built before checking npm).

The pattern across all four: _prior knowledge framed as a verified
claim about this surface_. Each dantotsu lands the local rule for
its layer; the CLAUDE.md tightening above is the cross-cutting
reminder that the failure mode applies to _every_ surface.

## See also

- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md) — rewritten in `2a4ecfc` with the verification procedure mentioned above.
