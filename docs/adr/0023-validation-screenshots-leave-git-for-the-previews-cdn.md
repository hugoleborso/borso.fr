# ADR-0023: Passing validation screenshots go to the previews CDN, failing ones stay in git

- **Status:** proposed
- **Date:** 2026-09-21
- **Deciders:** Hugo Borsoni
- **Tags:** meta, validation, cdk, devx

## Context

`/visual-validation` writes a verdict report and a folder of PNG screenshots under
`docs/features/<app>/<slug>/validation/`, and
[`.claude/skills/visual-validation/standard.md`](../../.claude/skills/visual-validation/standard.md)
requires both to be committed, on the grounds that a report without its screenshots cannot be
contested. That rule was written when the repository was young and its cost was assumed to be
negligible. It is no longer negligible.

Measured on `origin/main` at `3cdf324`: **791 PNG files under `docs/features/**` weigh 96.6 MB
of a 118 MB `.git`**, so screenshot evidence is 82% of the repository. The first commit is
2026-06-06, which puts the accumulation rate near 28 MB per month with nothing that ever
removes any of it.

A second force arrived at the same time. Reviewers want the screenshots inline in the pull
request body, and the skill already specifies the raw blob URL for that. GitHub CLI 2.99.0
(2026-09-01) added a native `--attach` flag that would have been the obvious transport, but it
is unusable from a hosted session: every `*.github.com` host is intercepted by the Claude Code
proxy, `POST /user/assets` answers `403 sessions are bound to their configured repositories`
and GraphQL answers `403 GitHub GraphQL is not available from Claude Code sessions`. The
transport question therefore has to be answered here rather than deferred to a vendor.

Two constraints close doors before the trade-off begins. Removing the existing 96.6 MB requires
rewriting history, which invalidates the 332 `commit/<sha>` links and 78 dantotsu eradication
hashes that are this repository's audit trail. And the merge convention is true merge commits
(50 of the last 50 on `main`), so a branch commit becomes an ancestor of `main`: anything
committed on a branch enters `main`'s history permanently, which is why a CI job cannot move
screenshots out of git after the fact.

## Decision

**Screenshots from a PASS row are uploaded from the session to the previews bucket and never
committed; screenshots a FAIL row references stay committed in git.** The split follows the
reason the original rule gave: what has to be permanent is the evidence of a failure, because
that is what gets contested months later. A passing screenshot is read once, by the reviewer
of that pull request, and the previews bucket already expires its objects after 60 days.

Existing history is left alone. The decision stops the growth; it does not try to undo it.

## Consequences

- `+` Repository growth from screenshots falls to the FAIL set only, which is a small fraction
  of runs.
- `+` The pull request body carries live images with no new infrastructure: the previews
  CloudFront function already routes any `<name>-pr-<n>` host, so `screenshots-pr-<n>` costs
  nothing to add.
- `+` Storage is effectively free. S3 Standard in eu-west-3 is $0.024/GB-month (pricing API);
  the steady-state stock under a 60-day expiry is roughly 73 MB, so $0.002/month, and
  CloudFront has billed $0.0000 for four consecutive months.
- `-` A PASS screenshot is gone 60 days after the run. A reviewer opening an old merged pull
  request sees broken images, and the verdict report's rows then stand on their text alone.
- `-` The session now needs write access to one S3 prefix, which widens `AI-Dev-ReadOnly`
  beyond read-only for the first time. The carve-out is one bucket prefix and `s3:PutObject`
  only; `s3:Delete*` stays denied everywhere, so a session cannot remove another run's
  evidence.
- `~` `docs/aws-setup.md` §12.6 becomes a prerequisite: until the policy is amended, the
  upload step fails and the skill falls back to committing everything, which is the old
  behaviour rather than a broken one.

## Alternatives considered

### Option A — PASS to the previews CDN, FAIL committed (chosen)

- **Summary:** The validator uploads a PASS run's PNGs to
  `s3://<previews-bucket>/screenshots/pr-<n>/<timestamp>/` and writes
  `https://screenshots-pr-<n>.preview.borso.fr/<timestamp>/<file>.png` into the report and the
  pull request body. A FAIL run commits its PNGs as before.
- **Strengths:**
  - Stops 28 MB/month of growth without touching a byte of history.
  - Keeps the permanence exactly where the original rule justified it.
  - Reuses infrastructure that exists: bucket, distribution, host routing, 60-day expiry rule.
- **Costs:**
  - One IAM policy amendment, done by hand, that no test in this repository can verify.
  - PASS evidence has a 60-day life.
- **Rationale:** It is the only option that stops the growth at its source, because the
  session is where the files are produced and every other transport requires them to exist in
  git first.

### Option B — Everything stays in git, only the pull request body is wired (rejected)

- **Summary:** Keep committing every screenshot; fix only the URL generation so the images
  render in the pull request body.
- **Strengths:** Ships today, needs no AWS change, and the evidence is permanent for both
  verdicts.
- **Costs:** 28 MB/month forever, and roughly 0.6 s of added clone time per month in a sandbox
  that re-clones on every session.
- **Rejection rationale:** It loses on the growth criterion, which is the one that triggered
  this ADR. Shifting the weights would flip it only if the clone cost were judged irrelevant,
  and the operator raised that cost as the reason to look.

### Option C — A second public repository holds the evidence (rejected)

- **Summary:** Push PNGs to `hugoleborso/borso.fr-evidence` and serve them through
  `raw.githubusercontent.com`.
- **Strengths:** No AWS, no IAM change, permanent evidence for both verdicts, and `borso.fr`
  stays small.
- **Costs:** A second repository to create, keep public, and keep in sync; a cross-repository
  link that nothing in this repository can check; and the same unbounded growth, moved rather
  than stopped.
- **Rejection rationale:** It loses on operational surface. It trades a policy line for a
  second repository whose lifecycle nobody owns, and it does not bound growth at all — it only
  moves where the bytes pile up.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Bounds repository growth | high | 82% of `.git` is already screenshots, and the sandbox re-clones every session. |
| Evidence survives where it is contested | high | The rule this ADR amends exists because a FAIL report without its screenshot is unrebuttable. |
| Operational surface added | medium | One-person lab; every new moving part is a thing that rots unwatched. |
| Cost in money | low | Measured at cents per month on every option. |

|  | Option A | Option B | Option C |
|---|---|---|---|
| Bounds repository growth | ✓ growth limited to FAIL runs | ✗ 28 MB/month, unbounded | ✗ same growth, different repository |
| Evidence survives where contested | ✓ FAIL permanent, PASS 60 days | ✓ both permanent | ✓ both permanent |
| Operational surface added | ✓ one policy line on existing infrastructure | ✓ nothing added | ✗ a second repository to own |
| Cost in money | ✓ $0.002/month | ✓ $0 direct | ✓ $0 direct |

## Implementation pointers

- Prerequisite: [`docs/aws-setup.md` §12.6](../aws-setup.md) — the `Explicit-write-deny`
  carve-out and the `Screenshots-publish` allow policy.
- Skill contract: [`.claude/skills/visual-validation/standard.md`](../../.claude/skills/visual-validation/standard.md)
  § *Where evidence lives*.
- Skill steps: [`.claude/skills/visual-validation/SKILL.md`](../../.claude/skills/visual-validation/SKILL.md)
  steps 8 and 9, and § *Visual evidence in the PR body*.
- Commit: {{SHA — stamped by /after-task-dantotsus on merge}}
- Related ADRs: ADR-0014 (generated files are not committed) — the same input/output split,
  applied to evidence rather than to generator output.
