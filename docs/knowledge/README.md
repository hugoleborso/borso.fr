# Knowledge

Documentation the team needs to work effectively — anything from
vendor quirks and CLI contracts to architecture rationales,
onboarding guides, debugging recipes, naming conventions, or
historical context for a non-obvious choice. Whatever helps a future
reader (or session) understand the system without re-deriving it
from first principles.

Knowledge is the floor of the eradication ladder defined in
[`../dantotsus/README.md`](../dantotsus/README.md#eradication-ladder).
A Dantotsu can fall back to "add a knowledge entry" when no higher
level is feasible — but knowledge entries can also stand alone, no
defect required.

## When does an entry belong here vs in `docs/dantotsus/`?

| Belongs in `dantotsus/` | Belongs in `knowledge/` |
| --- | --- |
| There was a defect (or near-miss) and we shipped an eradication | There's no defect — just something a reader would benefit from knowing |
| The "fix" is a code commit + diff | The "output" is the doc itself; no code lever exists or is needed |
| Future occurrences can be prevented at lint, type, or test time | The behaviour is just a fact (vendor, convention, design choice); we adapt |

Two failure modes to watch for:

- **Dantotsu-as-knowledge:** writing "captured as follow-up; not implemented" in a knowledge entry. That's a Dantotsu without an eradication. Move to `dantotsus/` and ship the fix.
- **Knowledge-as-handover-doc:** if a knowledge entry grows beyond ~100 lines or starts walking through a multi-step recipe, it's probably outgrown this folder. Promote it to its own file under `docs/` (e.g. `docs/local-dev.md`, `docs/aws-setup.md`).

## Index

### CloudFront

- [`cloudfront-function-throttle-persistence.md`](./cloudfront-function-throttle-persistence.md) — throttle state outlives a function code update; recovery 5–15 min.
- [`cloudfront-resources-in-us-east-1.md`](./cloudfront-resources-in-us-east-1.md) — control plane is region-pinned regardless of the distribution's data-plane region.
- [`cloudfront-get-function-binary-output.md`](./cloudfront-get-function-binary-output.md) — `aws cloudfront get-function` writes the source to a positional outfile, not stdout.
- [`cloudfront-cname-uniqueness.md`](./cloudfront-cname-uniqueness.md) — aliases (CNAMEs) are single-distribution; release from the old distribution before redeploying the new one.
- [`preview-api-cross-origin.md`](./preview-api-cross-origin.md) — previews use a custom-domain API per PR (`<app>-pr-<n>-api.preview.borso.fr`) because the shared previews distribution can't host per-app `/api/*` routing.
- [`cdk-route53-zone-token-pitfall.md`](./cdk-route53-zone-token-pitfall.md) — `ARecord(recordName: '<host>')` doubles the zone suffix when `zoneName` is a CFN token (resolves at deploy time, fails the literal-string suffix check). Trailing-dot the `recordName` to short-circuit.

### CDK / S3

- [`cdk-retain-buckets-orphan-on-failed-create.md`](./cdk-retain-buckets-orphan-on-failed-create.md) — `RemovalPolicy.RETAIN` on a literal-named bucket leaves an orphan if the first deploy of the stack fails post-bucket-create; manual `aws s3 rb` recovery.
- [`cfn-rollback-blocks-redeploys.md`](./cfn-rollback-blocks-redeploys.md) — `UPDATE_ROLLBACK_IN_PROGRESS` rejects new deploys; a CI retry fails in ~40 s and looks like a code regression. Poll status, wait for terminal state, then trigger.
- [`cfn-update-rollback-recovery.md`](./cfn-update-rollback-recovery.md) — recipe for unsticking a stack from `*_ROLLBACK_IN_PROGRESS`: wait → describe → continue-update-rollback with `--resources-to-skip` if needed. Includes the queued-`delete-stack`-races-CI-redeploy trap from PR #23.

### GitHub Actions

- [`workflow-dispatch-default-branch.md`](./workflow-dispatch-default-branch.md) — `workflow_dispatch` and `issue_comment` workflows only show in the UI once on the default branch.

### Operator / shell

- [`macos-bsd-vs-aws-cli-quirks.md`](./macos-bsd-vs-aws-cli-quirks.md) — BSD `date`, AWS CLI v2 list-parsing, `fileb://` for binary inputs.
- [`commitlint-header-100-char-cap.md`](./commitlint-header-100-char-cap.md) — `header-max-length` is hard-capped at 100 chars regardless of scope-enum richness.
- [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md) — `--executable-path` ignored once daemon runs; `screenshot` takes positional path, not `--output`; Chromium provisioning can fail behind proxies.

### pnpm / package management

- [`pnpm-peer-warning-is-not-enforcement.md`](./pnpm-peer-warning-is-not-enforcement.md) — pnpm only *warns* on peer-dep mismatch; installs succeed and the bad combination crashes at runtime.
- [`rtk-pnpm-install-can-skip-lockfile-write.md`](./rtk-pnpm-install-can-skip-lockfile-write.md) — when `pnpm install` is invoked through `rtk`, the lockfile sometimes doesn't write back; mirror from `node_modules/.pnpm/lock.yaml` if `git status` shows nothing changed.

### Claude Code tooling

- [`askuserquestion-tool-requires-question-field.md`](./askuserquestion-tool-requires-question-field.md) — `AskUserQuestion` rejects calls that omit the `question` field per item; `header` alone is not enough.
- [`claude-code-session-attachments-on-disk.md`](./claude-code-session-attachments-on-disk.md) — chat attachments live at `/root/.claude/uploads/<session>/...` (uploads) and inside `/root/.claude/projects/<workspace>/<session>.jsonl` (inlined base64 images); extractable without an explicit tool.
- [`pr-body-from-cc-ui-skips-skill-sections.md`](./pr-body-from-cc-ui-skips-skill-sections.md) — PRs opened from the Claude Code UI auto-generate a body that omits `## Visual evidence` and `## Validation gaps`; retrofit via `mcp__github__update_pull_request` after open.
- [`github-mcp-pr-body-sanitizer.md`](./github-mcp-pr-body-sanitizer.md) — `mcp__github__create_pull_request` / `update_pull_request` strip `<details>` blocks, wrap `![]()` image markdown in backticks, and strip pseudo-HTML tags inside inline code. Use raw `<img>` tags + drop `<tag>` inside backticks.

### Local dev / Postgres

- [`local-postgres-without-docker.md`](./local-postgres-without-docker.md) — `scripts/local-postgres.sh` boots a sandbox-private Postgres for any borso app when Docker is unavailable (claude.ai/code sandbox); per-app stable port, Drizzle-friendly, `pnpm run test` wires `DATABASE_URL` automatically.

### Aurora DSQL

- [`dsql-postgres-compat-gaps.md`](./dsql-postgres-compat-gaps.md) — catalogue of DSQL's divergences from Postgres (no jsonb, no FKs, no multi-DDL tx, no partial indexes, no advisory locks, no `USING <method>` on CREATE INDEX, retries need `IF NOT EXISTS`, only `admin` user, IAM is per-cluster).
- [`dsql-serverless-pricing-vs-aurora.md`](./dsql-serverless-pricing-vs-aurora.md) — DSQL bills per DPU + per GB-month, not per cluster; idle clusters cost ~nothing. The "one-cluster-per-app" choice is about latency + quotas + ordering, not cost.

### Build / lint tooling

- [`biome-stack-overflow-on-dist-binaries.md`](./biome-stack-overflow-on-dist-binaries.md) — Biome 2.x stack-overflows on woff/png binaries in `dist/`; turn on `vcs.useIgnoreFile`.
- [`biome-ignore-must-be-single-line.md`](./biome-ignore-must-be-single-line.md) — Biome `lint:` suppression comments must be a single line directly above the diagnostic; multi-line forms silently no-op.
- [`ts-narrowing-lost-in-function-declarations.md`](./ts-narrowing-lost-in-function-declarations.md) — TS preserves narrowing in arrow expressions but not in `function` declarations inside the same scope; convert helpers in `useEffect` to arrow form.

### Validation tooling

- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md) — `agent-browser set device` does not propagate `matchMedia('(pointer: coarse)')`; touch-affordance assertions land UNVERIFIABLE without a workaround.
- [`agent-browser-cdp-click-no-op-on-react-onclick.md`](./agent-browser-cdp-click-no-op-on-react-onclick.md) — CDP `click @ref` doesn't reliably fire React `onClick`; fall back to `element.click()` via `agent-browser eval`.
- [`visual-validator-image-size-limit.md`](./visual-validator-image-size-limit.md) — past ~20 high-res screenshots, the validator's API session crashes on the per-image 2000 px ceiling; cap screenshots at 10 and prefer viewport over full-page.
- [`visual-validation-skill-vs-agent-browser-direct.md`](./visual-validation-skill-vs-agent-browser-direct.md) — `/visual-validation` is the feature-gate skill (full spec walk, separate agent, committed evidence); for single-fix iteration use `agent-browser` directly in the main session — minutes vs seconds.

### Spec & metrics framing

- [`input-vs-output-metrics.md`](./input-vs-output-metrics.md) — Amazon flywheel framing for the *Why → measurable objective* split; visual-validation drives input metrics only.
- [`audit-imported-deps-and-patterns-when-planning.md`](./audit-imported-deps-and-patterns-when-planning.md) — when porting / iterating, run a Pattern Coherence pass at planning time; question every dep and every state-management pattern instead of carrying them forward.

### Skills & orchestration

- [`tech-lead-orchestrator.md`](./tech-lead-orchestrator.md) — operator notes for `/tech-lead-orchestrator`: artefact layout under `runs/<run-id>/`, how to read `journal.md.jsonl`, common debugging recipes (double auto-chain, unparseable verdict, spec mutation, hook failure), dogfooding expectations.

### Browser / forms

- [`ios-files-picker-uti-greys-extensions.md`](./ios-files-picker-uti-greys-extensions.md) — iOS Files filters file inputs by Apple UTI, not by extension or MIME. `.gpx` and other unregistered extensions are greyed out when `accept` lists them; drop `accept` and validate server-side.

### Fonts / typography

- [`major-mono-display-monocase-vs-uppercase.md`](./major-mono-display-monocase-vs-uppercase.md) — Major Mono Display ships two glyph families; `text-transform: uppercase` is mandatory for the decorative caps-geo variant the design preset usually wants.

### Vendored React components

- [`react-bits-galaxy-mouse-events-vs-touch.md`](./react-bits-galaxy-mouse-events-vs-touch.md) — react-bits Galaxy listens on `mousemove` only; touch is silently broken on mobile. Swap to `pointermove`/`pointerleave` + `touch-action: none` on the container; also set `pointer-events: auto` if a parent has `none`.

### Frontend / React

- [`rolled-our-own-data-fetching-instead-of-tanstack-query.md`](./rolled-our-own-data-fetching-instead-of-tanstack-query.md) — the cost of writing custom `useStandingsPoll` / `useResource` hooks instead of TanStack Query: each new bug found in our hooks (the PR #23 polling storm) would've been a library author's problem already. Migration sketch when the data layer needs to grow.
- [`svg-preserveaspectratio-distorts-non-uniform.md`](./svg-preserveaspectratio-distorts-non-uniform.md) — `preserveAspectRatio="none"` distorts circles into ellipses when the container aspect ≠ viewBox aspect. Default (`xMidYMid meet`) preserves and letterboxes.

### last-loop-lepin app domain

- [`race-end-signal-duality.md`](./race-end-signal-duality.md) — two end-of-race signals (`edition.status === 'finished'` admin intent, `standings.raceEnded` engine truth) and which call sites should consume which.

### borsouvertures / chess libraries

- [`chessjs-v1-throws-on-illegal-move.md`](./chessjs-v1-throws-on-illegal-move.md) — `chess.js` v1 throws on illegal moves; v0 returned `null`. Wrap every `chess.move` in `try`/`catch`.
- [`react-chessboard-l-arrows-v5.md`](./react-chessboard-l-arrows-v5.md) — v5 detects knight moves and draws native L-shaped arrows; consolidated `options` prop; React-19 peer requirement.
- [`pwa-third-party-cdn-breaks-offline.md`](./pwa-third-party-cdn-breaks-offline.md) — third-party image CDNs break PWAs offline (and often online via hotlink-blocking 403s); bundle assets or use library-bundled SVGs.

## Adding a new entry

Knowledge entries don't need YAML frontmatter or a fixed structure —
write whatever helps the next reader. Keep it concrete and short
(short enough to re-read every time you suspect it applies). Title
should hint at the lesson, not the symptom.

If the entry is the result of a `/after-task-dantotsus` sweep that
classified a subject as "vendor surprise" or "operator confusion",
the skill writes it here automatically.
