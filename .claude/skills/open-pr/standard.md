# Open-PR standard

The canonical shape of a `/open-pr` body. Three rules:

1. **Three levels of disclosure, always.** Level 1 = always visible.
   Level 2 = `<details><summary>…</summary>…</details>`. Level 3 =
   `<details>` nested inside a level-2 `<details>`.
2. **Sourcing is verbatim.** Every level-1 line, ADR rationale, spec
   excerpt, validation row is pulled near-verbatim from the upstream
   document. The skill is a *renderer*, not an author.
3. **Hierarchy by surface area.** A 200-line feature has more
   collapsible space than a 20-line fix. Skip blocks that don't apply
   — no empty `<details>` shells. Silence is information: it tells
   the reviewer the gate is irrelevant here.

## Body layout (top to bottom)

### Section 1: Summary (level 1)

1–3 sentences. The *why* + the *what* in one breath. No "see below" /
"more details inside" pointers — those defeat the level-1 promise.

```markdown
## Summary
Adds the live race-day dashboard for last-loop-lepin: spectator
leaderboard, admin punch console, runner fiche page, all backed by a
single Hono Lambda over Aurora DSQL. Validates PreviewableApp's first
real-world consumer.
```

### Section 2: Validation verdicts (level 1)

A two-line block. **The reviewer's go/no-go signal.** PASS lines link
to the report. UNVERIFIABLE lines mention how many; the rows themselves
live in section 8.

```markdown
## Validation
- Visual:    PASS — [report](docs/features/<app>/<slug>/validation/visual-validation-…md)
- Technical: PASS — [report](…/technical-validation-…md)
```

When either is `PASS_EXCEPT_UNVERIFIABLE`, append `(N unverifiable — see
§ Validation gaps)`.

### Section 3: Architecture choices (level 1 → 2 → 3)

One bullet per ADR referenced by the diff or the plan. Level 1 = the
chosen path, one line. Level 2 = the ADR's *Decision* + *Consequences*.
Level 3 = *Alternatives considered* + *Evaluation rubric*.

```markdown
## Architecture choices

- **Persistence: Aurora DSQL (per-app cluster, drizzle-kit migrate).**
  ADR-0002. Idle cost dominates; the race runs once a year.

  <details><summary>Rationale (consequences, costs)</summary>

  <!-- Decision + Consequences from ADR-0002 -->

  </details>

  <details><summary>Alternatives considered (Option B/C, criteria)</summary>

  <!-- Alternatives + Evaluation rubric from ADR-0002 -->

  <details><summary>Implementation pointers</summary>

  <!-- Commit, files, related ADRs from ADR-0002 -->

  </details>
  </details>
```

If the diff makes a non-trivial decision *without* an ADR, the skill
flags it in section 9 (*Known gaps*) — `/adr` should run before the PR
is opened.

### Section 4: What the user sees / does (level 1 → 2)

A spec-driven walk of the user-visible changes. Level 1 = bullet list
of capabilities; level 2 = the spec section's verbatim sub-bullets.

```markdown
## What the user sees / does

- Spectators see the live leaderboard, the eliminated wall, the
  countdown to the next top, the course map.

  <details><summary>Spec § Result (visible)</summary>

  <!-- The spec's "Result" sub-section, verbatim -->

  </details>

- Admins (PIN-protected) punch finishers, correct mistakes, decide
  DNFs at each top.
  <!-- … -->
```

### Section 5: Visual evidence (level 1 wrapper → 2 screenshots)

Screenshots from the latest visual-validation report. SHA-pinned URLs
(`https://github.com/<owner>/<repo>/raw/<sha>/<path>.png`). On mobile or
edge-case screenshots, wrap them in their own nested `<details>` so the
desktop hero stays above the fold.

```markdown
## Visual evidence

![Spectator](https://github.com/hugoleborso/borso.fr/raw/abc1234/docs/.../01-spectator.png)
![Admin](https://github.com/hugoleborso/borso.fr/raw/abc1234/docs/.../02-admin.png)

<details><summary>Mobile + edge cases (5 screenshots)</summary>

<!-- More embedded raw blob URLs -->

</details>
```

### Section 6: Test plan (level 1 checklist → 2 detail)

Level 1 = a small bullet checklist the reviewer ticks during a manual
pass (if any). Level 2 = the suite tallies + the commands that
reproduce the gate.

```markdown
## Test plan

- [ ] Site loads at the preview URL without console errors.
- [ ] Admin login with the dev PIN; punch one runner; the leaderboard updates.
- [ ] /r/<runner-slug> renders without auth.

<details><summary>Automated gates (run on CI)</summary>

- `pnpm --filter @borso-app/<app> run test:core` → 120 tests, 100/100/100/100 perFile.
- `pnpm --filter @borso-app/<app> run test`       → 198 tests over Postgres.
- `pnpm --filter @borso-app/<app> run typecheck`  → clean.
- `pnpm --filter @borso-app/<app> run lint`       → clean.
- `pnpm exec knip`                                → clean.

</details>
```

### Section 7: What changed (level 2)

A single `<details>` containing the diffstat + per-folder one-line
summary. Level 2 because the diff is the artefact reviewers open in
GitHub's "Files changed" tab; the body's role is index, not
replacement.

```markdown
<details><summary>What changed (diffstat)</summary>

| Folder | Lines | Purpose |
|---|---|---|
| `apps/last-loop-lepin/api/`  | +1240 / -0 | Hono + Drizzle backend |
| `apps/last-loop-lepin/site/` | +890  / -0 | Vite + React frontend |
| `apps/last-loop-lepin/cdk/`  | +260  / -0 | PreviewableApp + DsqlClusterStack |
| `docs/features/last-loop-lepin/race-day-live/` | +1800 / -0 | spec, plan, validation |
| `infra/cdk/`                 | +0 / -0 | (unchanged) |

`git log origin/main..HEAD --oneline`

</details>
```

### Section 8: Validation gaps (only if PASS_EXCEPT_UNVERIFIABLE)

Reproduces the visual-validation / technical-validation skills' PR
disclosure rule. Level 1 because the gap has to be visible up-front.

```markdown
## Validation gaps

- Row 34 (visual): "Domaine last-loop-lepin.borso.fr lisible" —
  validator only saw localhost. Pin closed at deploy time, not now.
  See [report](…visual-validation-…md).
```

### Section 9: Known gaps & follow-ups (level 2)

Bullets for everything *intentionally deferred*. Each bullet either
links to a Dantotsu, a `docs/knowledge/` entry, or a future kaizen
PR.

```markdown
<details><summary>Known gaps and follow-ups</summary>

- 100% coverage on the back-e2e gate (`api/src/**`) is deferred to a
  follow-up `kaizen` PR — gate currently runs tests but doesn't
  threshold coverage. Rationale in `vitest.workspace.ts`.
- Streaming responses (`awslambda.streamify`) not wired — LambdaApi
  backs the function with API Gateway HTTP API; future infra refactor.
- `runner.core.totalElapsedMs` is unused outside its test; will land
  on the runner-fiche page in a follow-up.

</details>
```

### Section 10: Dantotsus uncovered (level 2, optional)

If the work surfaced one or more Dantotsus, list them with a one-line
*Root cause / Eradication* per entry. Empty section is skipped.

```markdown
<details><summary>Dantotsus uncovered</summary>

- [`docs/dantotsus/getSnapshot-unstable.md`](…) — useSyncExternalStore
  unmounted the React tree because each render built a fresh
  `{ value, error }` object. Eradicated: snapshot cached on the
  module-scoped registry.

</details>
```

## Title

Conventional-commits per `commitlint.config.js`:

```
feat(<scope>): <subject — lowercase, no trailing period, ≤ 70 chars>
```

Scope is one of the commitlint `scope-enum` values
(`borso-fr`, `borsouvertures`, `last-loop-lepin`, `infra`, `ci`,
`docs`, `deps`).

## Trailer

The body's last line is always:

```
https://claude.ai/code/session_<id>
```

— a backlink to the session that produced the PR, in the same format the
repo uses for commit-message trailers (see CLAUDE.md "Git Operations").

## Draft vs ready

- `--draft` by default. The user has to say "ready to merge" or "open
  it as ready" for the skill to drop `--draft`.
- If either validation is `PASS_EXCEPT_UNVERIFIABLE`, the skill keeps
  `--draft` regardless of the user's request and surfaces why.

## Hook contract

`.claude/hooks/pretool-gh-pr-create.sh` exits non-zero when:

- The matched command is `gh pr create`, AND
- The provided body (via `--body` literal or `--body-file <path>`) is
  shorter than 800 characters, OR
- Fewer than 3 `<details>` blocks are present in the body, OR
- No `## Validation` block is present and `docs/features/<app>/<slug>/validation/`
  has any reports (i.e. the operator forgot to surface verdicts).

Hook output is a single-line message starting `[open-pr]` pointing at
the `/open-pr` skill. The skill picks it up via the `<user-prompt>`
context and re-runs.
