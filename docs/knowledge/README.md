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

- [`s3-sync-serves-html-without-a-charset.md`](./s3-sync-serves-html-without-a-charset.md) — `aws s3 sync` sets `Content-Type` from the extension and sends a bare `text/html`, so the same bytes that read fine from GitHub Pages render as mojibake once published.
- [`a-rebase-cannot-see-what-a-merge-decided.md`](./a-rebase-cannot-see-what-a-merge-decided.md) — a rebase replays the work and drops every reconciliation the merge commits carried. Measured: three shortcuts, 52 and 36 files wrong, `rerere` zero hits, `git cherry` blind to thirty duplicates.
- [`cloudfront-function-throttle-persistence.md`](./cloudfront-function-throttle-persistence.md) — throttle state outlives a function code update; recovery 5–15 min.
- [`cloudfront-resources-in-us-east-1.md`](./cloudfront-resources-in-us-east-1.md) — control plane is region-pinned regardless of the distribution's data-plane region.
- [`cloudfront-get-function-binary-output.md`](./cloudfront-get-function-binary-output.md) — `aws cloudfront get-function` writes the source to a positional outfile, not stdout.
- [`cloudfront-cname-uniqueness.md`](./cloudfront-cname-uniqueness.md) — aliases (CNAMEs) are single-distribution; release from the old distribution before redeploying the new one.
- [`eslint-content-cache-replays-a-stale-type-aware-error.md`](./eslint-content-cache-replays-a-stale-type-aware-error.md) — `--cache-strategy content` keys on the linted file, and a type-aware rule depends on the whole graph, so an error you already fixed keeps being reported. `rm -f .eslintcache`.
- [`how-a-mutation-survivor-hides.md`](./how-a-mutation-survivor-hides.md) — three cases where a test reads as sufficient and is not: a `Stryker disable` covering one line of a multi-line statement, `toContain` blind to a prepended digit, and a capture-boundary mutant that is genuinely equivalent.
- [`knip-does-not-follow-a-stryker-vitest-config.md`](./knip-does-not-follow-a-stryker-vitest-config.md) — knip's Stryker plugin resolves package names and never follows `vitest.configFile`, so the config it points at reads as unreferenced.
- [`apigw-http-api-has-no-response-streaming.md`](./apigw-http-api-has-no-response-streaming.md) — an HTTP API buffers the whole response, so `streamifyResponse` does nothing behind `LambdaApi`; streaming needs a Function URL with `RESPONSE_STREAM`, which is an ADR.
- [`preview-api-cross-origin.md`](./preview-api-cross-origin.md) — previews use a custom-domain API per PR (`<app>-pr-<n>-api.preview.borso.fr`) because the shared previews distribution can't host per-app `/api/*` routing.
- [`cdk-route53-zone-token-pitfall.md`](./cdk-route53-zone-token-pitfall.md) — `ARecord(recordName: '<host>')` doubles the zone suffix when `zoneName` is a CFN token (resolves at deploy time, fails the literal-string suffix check). Trailing-dot the `recordName` to short-circuit.

### CDK / S3

- [`esbuild-esm-dynamic-require-of-buffer.md`](./esbuild-esm-dynamic-require-of-buffer.md) — an ESM-bundled Lambda that inlines `@aws-sdk/dsql-signer` dies at cold start with `Dynamic require of "buffer" is not supported`; the `createRequire` banner is what prevents it, and the stack deploys green either way.
- [`integ-test-tag-must-be-absent-not-false.md`](./integ-test-tag-must-be-absent-not-false.md) — the integ role's IAM policy keys off the *presence* of the `IntegTest` tag, so setting it to `false` elsewhere widens the role rather than narrowing it.
- [`vitest-4-invokes-mock-implementations-as-constructors.md`](./vitest-4-invokes-mock-implementations-as-constructors.md) — a mock for a class reached with `new` must be a function declaration; an arrow has no `[[Construct]]` and fails with "is not a constructor".
- [`preview-deploys-never-delete-what-you-removed.md`](./preview-deploys-never-delete-what-you-removed.md) — `prune: false` on the preview `BucketDeployment` keeps serving files a commit deleted; prod is unaffected because it takes the CDK default.
- [`cdk-retain-buckets-orphan-on-failed-create.md`](./cdk-retain-buckets-orphan-on-failed-create.md) — `RemovalPolicy.RETAIN` on a literal-named bucket leaves an orphan if the first deploy of the stack fails post-bucket-create; manual `aws s3 rb` recovery.
- [`cfn-rollback-blocks-redeploys.md`](./cfn-rollback-blocks-redeploys.md) — `UPDATE_ROLLBACK_IN_PROGRESS` rejects new deploys; a CI retry fails in ~40 s and looks like a code regression. Poll status, wait for terminal state, then trigger.
- [`cfn-update-rollback-recovery.md`](./cfn-update-rollback-recovery.md) — recipe for unsticking a stack from `*_ROLLBACK_IN_PROGRESS`: wait → describe → continue-update-rollback with `--resources-to-skip` if needed. Includes the queued-`delete-stack`-races-CI-redeploy trap from PR #23.

### GitHub Actions

- [`reading-third-party-sources-from-a-session.md`](./reading-third-party-sources-from-a-session.md) — arXiv `/abs/` parses and `/pdf/` does not, and a third-party GitHub repository is reachable only through the rendered page or `add_repo`.
- [`the-shell-gates-are-only-ever-run-where-they-pass.md`](./the-shell-gates-are-only-ever-run-where-they-pass.md) — 26 gate scripts, no tests, and pre-commit and CI only ever run them on a tree where they pass. Why a harness is hard, and what to do until there is one.
- [`workflow-dispatch-default-branch.md`](./workflow-dispatch-default-branch.md) — `workflow_dispatch` and `issue_comment` workflows only show in the UI once on the default branch.
- [`a-conflicted-pull-request-gets-no-checks.md`](./a-conflicted-pull-request-gets-no-checks.md) — a `pull_request` workflow runs against `refs/pull/<n>/merge`, so a conflicting pull request gets **zero** runs rather than red ones. An empty checks list means `mergeable_state: dirty` far more often than it means a dropped event; merge the base branch in and push.
- [`github-scheduled-workflows-fire-late.md`](./github-scheduled-workflows-fire-late.md) — measured: this repo's nightly cron fires 1h01m–2h45m after its declared time, every day observed. Never key a wait on the cron expression; read the last few `created_at` values instead. Includes the monitor-that-cannot-report-its-own-failure trap.
- [`github-oidc-sub-claim-per-trigger.md`](./github-oidc-sub-claim-per-trigger.md) — the OIDC `sub` claim describes the *event*, not the workflow, so adding a `schedule:` trigger changes the credential presented; claim-per-trigger table, why `environment:` wins, and how to trust several.

### Operator / shell

- [`macos-bsd-vs-aws-cli-quirks.md`](./macos-bsd-vs-aws-cli-quirks.md) — BSD `date`, AWS CLI v2 list-parsing, `fileb://` for binary inputs.
- [`commitlint-header-100-char-cap.md`](./commitlint-header-100-char-cap.md) — `header-max-length` is hard-capped at 100 chars regardless of scope-enum richness.
- [`gate-timings-before-and-after.md`](./gate-timings-before-and-after.md) — what every gate costs, measured: ESLint is 23x slower than biome cold and identical warm; CI went from a 97 s median to ~180 s cache-cold; test suites roughly doubled.
- [`a-timeout-under-parallel-gates-is-not-a-regression.md`](./a-timeout-under-parallel-gates-is-not-a-regression.md) — four cores, gates in parallel: three CDK timeouts read as a vitest 4 regression and were contention. Re-run the suite alone before blaming a version; three tells for spotting it; why CPU-bound tests need an explicit `testTimeout`.
- [`agentic-device-testing.md`](./agentic-device-testing.md) — `@swmansion/argent` drives real iOS Simulators / Android emulators / TVs; why a 375 px Chromium resize is not a phone test; what the web sandbox cannot run (no `/dev/kvm`, no Xcode); `scripts/argent.sh` is the way in, and its touch gestures do work here.
- [`agent-browser-cli-quirks.md`](./agent-browser-cli-quirks.md) — `--executable-path` ignored once daemon runs; `screenshot` takes positional path, not `--output`; Chromium provisioning can fail behind proxies. _2026-08-18_: SessionStart now points the CLI at the container's own Chromium, and a `click` on a ref below the fold of a nested scroller reports success while doing nothing — scroll the element that owns the overflow, then hit-test, before calling a button dead.
- [`zsh-read-p-coprocess-quirk.md`](./zsh-read-p-coprocess-quirk.md) — `read -rsp "prompt: " var` is bash-only ; zsh reads `-p` as a coprocess flag and errors. Use `printf` + `stty -echo` + `read -r` for portable interactive prompts.
- [`aws-dsql-cli-token-flag-name.md`](./aws-dsql-cli-token-flag-name.md) — `aws dsql generate-db-connect-admin-auth-token` wants `--hostname <endpoint>` ; the older `--identifier <cluster-id>` form is rejected.
- [`destructive-git-with-uncommitted-verification-work.md`](./destructive-git-with-uncommitted-verification-work.md) — proving an eradication works means breaking the code, and `git checkout --` then reverts the eradication with the probe. Commit first; three losses in one session.
### pnpm / package management

- [`pnpm-peer-warning-is-not-enforcement.md`](./pnpm-peer-warning-is-not-enforcement.md) — pnpm only *warns* on peer-dep mismatch; installs succeed and the bad combination crashes at runtime.
- [`rtk-pnpm-install-can-skip-lockfile-write.md`](./rtk-pnpm-install-can-skip-lockfile-write.md) — when `pnpm install` is invoked through `rtk`, the lockfile sometimes doesn't write back; mirror from `node_modules/.pnpm/lock.yaml` if `git status` shows nothing changed.

### Claude Code tooling

- [`an-agent-added-by-main-is-not-dispatchable-yet.md`](./an-agent-added-by-main-is-not-dispatchable-yet.md) — the agent registry is read once at session start, so a `.claude/agents/*.md` that arrives mid-session (merged from `main`, or written by you) is on disk and still *agent type not found*.
- [`two-agents-in-one-working-tree.md`](./two-agents-in-one-working-tree.md) — how a concurrent writer shows itself (`git diff` md5 moving over 60 s, findings that no longer reproduce), why staging explicit paths matters, and how to check a background run is really dead before launching a second one.
- [`github-is-reachable-only-through-the-mcp-server.md`](./github-is-reachable-only-through-the-mcp-server.md) — `curl https://api.github.com` answers 403 and there is no `gh`; the MCP returns bodies HTML-escaped, which makes splicing a long PR description riskier than adding a comment.
- [`askuserquestion-tool-requires-question-field.md`](./askuserquestion-tool-requires-question-field.md) — `AskUserQuestion` rejects calls that omit the `question` field per item; `header` alone is not enough.
- [`claude-code-session-attachments-on-disk.md`](./claude-code-session-attachments-on-disk.md) — chat attachments live at `/root/.claude/uploads/<session>/...` (uploads) and inside `/root/.claude/projects/<workspace>/<session>.jsonl` (inlined base64 images); extractable without an explicit tool.
- [`pr-body-from-cc-ui-skips-skill-sections.md`](./pr-body-from-cc-ui-skips-skill-sections.md) — PRs opened from the Claude Code UI auto-generate a body that omits `## Visual evidence` and `## Validation gaps`; retrofit via `mcp__github__update_pull_request` after open.
- [`github-mcp-pr-body-sanitizer.md`](./github-mcp-pr-body-sanitizer.md) — _rewritten 2026-05-21, first confirmed behaviour added 2026-08-14_: the three originally-asserted patterns were not reproducible (PR #26 has working `<details>` and `![]()`), so the entry ships a round-trip verification procedure and names PR #26 as the control sample. One behaviour has now survived it: markdown links come back wrapped in double backticks, inside the parentheses, so the anchor is dead — observed four times across PRs #46 and #48 while other links in the same bodies survived. The trigger is URL length: six samples separate cleanly at about 150 characters. Mitigation: link through `/blob/main/` rather than a long agent branch name, which takes 38 characters off every link. _2026-08-18_: a second, sharper behaviour — every URL ending in an image extension is backtick-wrapped, `<img>` loses its `src`, `<details>` is stripped and an autolink is removed, so no screenshot can be embedded in a body written through this server. A PreToolUse hook now refuses such a body before the call.
- [`cdk-out-tmp-fills-the-sandbox-disk.md`](./cdk-out-tmp-fills-the-sandbox-disk.md) — `vitest run` on `infra/cdk/` accretes `/tmp/cdk.out*` staging dirs (~24 MB each, 100s+ on a long-running sandbox), eventually exhausting `/tmp` and breaking the suite with `ENOSPC`. SessionStart now sweeps them; recovery + cause documented.
- [`subagents-that-were-never-told-their-label.md`](./subagents-that-were-never-told-their-label.md) — every `KAIZEN.md` line saying `main` after a task that spawned agents means the sweep cannot tell one agent's wall from four agents' wall.
- [`a-generated-label-should-name-the-thing.md`](./a-generated-label-should-name-the-thing.md) — a generated UI label that reuses an internal id names the mechanism; keep the id, add a label.
- [`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md) — which of the two tools answers which question, and the traps in each.
- [`dynamic-workflow-feature-pipeline.md`](./dynamic-workflow-feature-pipeline.md) — the operator runbook for the `plan → ship` Dynamic Workflow.
- [`claude-code-built-in-output-styles.md`](./claude-code-built-in-output-styles.md) — the `outputStyle` setting, why it belongs in the committed settings file rather than the local one a hosted session never sees, and how to read the built-in names out of the installed binary when the published page is a release behind.
- [`sleep-is-compressed-in-the-hosted-sandbox.md`](./sleep-is-compressed-in-the-hosted-sandbox.md) — `sleep` returns early whatever duration you ask for, so eight polls of a CI job read as a 40-minute hang when four minutes had passed; `python3 -c "import time; time.sleep(n)"` waits for real, and `date -u` is the check before you diagnose any remote hang.
- [`what-a-hosted-session-cannot-do-on-github.md`](./what-a-hosted-session-cannot-do-on-github.md) — measured capabilities of a claude.ai/code session: it can merge pull requests and push to a `dependabot/*` branch, it cannot dispatch a workflow by any of three routes, and two API fields (`merged`, and the size of `get_diff`) will mislead you.
### Local dev / Postgres

- [`local-postgres-without-docker.md`](./local-postgres-without-docker.md) — `scripts/local-postgres.sh` boots a sandbox-private Postgres for any borso app when Docker is unavailable (claude.ai/code sandbox); per-app stable port, Drizzle-friendly, `pnpm run test` wires `DATABASE_URL` automatically.
- [`dsql-clone-from-prod.md`](./dsql-clone-from-prod.md) — cloning a production schema into a preview, and what the clone does not carry.
- [`the-committed-template-snapshot-is-not-the-deployed-stack.md`](./the-committed-template-snapshot-is-not-the-deployed-stack.md) — the `borso-shared` snapshot is synthesized with stubbed certificates, so comparing it to the live template invents deletions that never happen; what the comparison *does* catch is a stack several merges behind its dispatch-only deploy.
### Aurora DSQL

- [`dsql-postgres-compat-gaps.md`](./dsql-postgres-compat-gaps.md) — catalogue of DSQL's divergences from Postgres (no jsonb, no FKs, no multi-DDL tx, no partial indexes, no advisory locks, no `USING <method>` on CREATE INDEX, retries need `IF NOT EXISTS`, only `admin` user, IAM is per-cluster).
- [`dsql-serverless-pricing-vs-aurora.md`](./dsql-serverless-pricing-vs-aurora.md) — DSQL bills per DPU + per GB-month, not per cluster; idle clusters cost ~nothing. The "one-cluster-per-app" choice is about latency + quotas + ordering, not cost.
- [`cloudwatch-retention-bounds-an-absence-claim.md`](./cloudwatch-retention-bounds-an-absence-claim.md) — `filter-log-events` accepts a window far older than the group's retention and says nothing, so "this never happened" is only ever a claim about the retained days. Read `retentionInDays` and the oldest event before quoting a period.
- [`dsql-strong-consistency-is-per-connection.md`](./dsql-strong-consistency-is-per-connection.md) — read-after-write is consistent within a connection, not across them; a `PUT` then an immediate `GET` on a different Lambda/connection can read the pre-commit snapshot. A warm-connection `curl` loop won't reproduce it; reconcile from the mutation response, not a blind refetch.
- [`drizzle-unique-index-is-not-a-unique-constraint.md`](./drizzle-unique-index-is-not-a-unique-constraint.md) — `uniqueIndex` lands in `getTableConfig().indexes`, not `.uniqueConstraints`; asserting against the wrong one passes on `undefined`.
### Build / lint tooling

- [`authoring-the-architecture-page-runtime-script.md`](./authoring-the-architecture-page-runtime-script.md) — the page's browser script is emitted from a template literal, so a literal backtick closes it and a comment inside it is invisible to `borso/no-comments`; plus why `git log --follow` makes a moved file read as new in the hotspots report.
- [`stryker-sandbox-and-plugin-resolution-under-pnpm.md`](./stryker-sandbox-and-plugin-resolution-under-pnpm.md) — pnpm's symlinked store defeats Stryker's plugin glob, so the runner must be named; and a sandbox inside the workspace makes `infra/cdk` snapshot tests fail with `ENOENT` in `AssetStaging.calculateHash` under the parallel pre-push wave.
- [`eslint-rule-tester-needs-vitest-globals.md`](./eslint-rule-tester-needs-vitest-globals.md) — Vitest installs no test globals without `globals: true`, so a `RuleTester` suite registers zero cases and passes vacuously; plus why an `eslint-disable` valid case fails as an unused directive.
- [`biome-stack-overflow-on-dist-binaries.md`](./biome-stack-overflow-on-dist-binaries.md) — Biome 2.x stack-overflows on woff/png binaries in `dist/`; turn on `vcs.useIgnoreFile`.
- [`biome-ignore-must-be-single-line.md`](./biome-ignore-must-be-single-line.md) — Biome `lint:` suppression comments must be a single line directly above the diagnostic; multi-line forms silently no-op.
- [`biome-grit-jsx-matching.md`](./biome-grit-jsx-matching.md) — Grit plugins targeting JSX need `engine biome(1.0)` + `language js(jsx)` + the `JsxString()` node ; the JS-string templates from the docs match nothing on JSX attribute literals.
- [`biome-formatter-trips-line-count-ceiling.md`](./biome-formatter-trips-line-count-ceiling.md) — a `biome check --write` pass can split JSX/ternaries enough to push an untouched file past `noExcessiveLinesPerFile` ; option set + escape hatch.
- [`ts-narrowing-lost-in-function-declarations.md`](./ts-narrowing-lost-in-function-declarations.md) — TS preserves narrowing in arrow expressions but not in `function` declarations inside the same scope; convert helpers in `useEffect` to arrow form.
- [`lambda-esm-native-modules.md`](./lambda-esm-native-modules.md) — ESM-bundled Lambdas crash at cold start on `__dirname is not defined`; the shared banner restores `require`, `__filename`, `__dirname`, and prefer pure-WASM (`hash-wasm`) over native modules (`argon2`, `bcrypt`).
- [`stryker-sandbox-breaks-a-global-setup-outside-the-workspace.md`](./stryker-sandbox-breaks-a-global-setup-outside-the-workspace.md) — Stryker runs from a sandbox copy, so a Vitest `globalSetup` at `../../scripts/` resolves to a file that is genuinely absent; plus the pnpm `--` forwarding trap and the `.stryker-tmp` leftovers.
### Validation tooling

- [`judging-an-animation-you-cannot-watch.md`](./judging-an-animation-you-cannot-watch.md) — stills have no speed in them, `getComputedStyle` lags under throttling; pin `currentTime` and capture through CDP instead.
- [`run-repo-tools-from-the-directory-they-expect.md`](./run-repo-tools-from-the-directory-they-expect.md) — blueprint generators from the repo root, vitest from the app workspace, and what each unhelpful error actually means.
- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md) — `agent-browser set device` does not propagate `matchMedia('(pointer: coarse)')`; touch-affordance assertions land UNVERIFIABLE without a workaround, or go through `scripts/argent.sh`, which sends real touch.
- [`real-touch-gestures-over-cdp.md`](./real-touch-gestures-over-cdp.md) — argent declines `gesture-swipe` and `gesture-custom` on Chromium, and its `gesture-scroll` and `gesture-drag` send wheel and mouse events rather than a finger; drive `Input.dispatchTouchEvent` over CDP for any behaviour that depends on `touch-action` or on the browser deciding mid-gesture who gets it.
- [`agent-browser-cdp-click-no-op-on-react-onclick.md`](./agent-browser-cdp-click-no-op-on-react-onclick.md) — CDP `click @ref` doesn't reliably fire React `onClick`; fall back to `element.click()` via `agent-browser eval`.
- [`visual-validator-image-size-limit.md`](./visual-validator-image-size-limit.md) — past ~20 high-res screenshots, the validator's API session crashes on the per-image 2000 px ceiling; cap screenshots at 10 and prefer viewport over full-page.
- [`visual-validation-skill-vs-agent-browser-direct.md`](./visual-validation-skill-vs-agent-browser-direct.md) — `/visual-validation` is the feature-gate skill (full spec walk, separate agent, committed evidence); for single-fix iteration use `agent-browser` directly in the main session — minutes vs seconds.

### Spec & metrics framing

- [`input-vs-output-metrics.md`](./input-vs-output-metrics.md) — Amazon flywheel framing for the *Why → measurable objective* split; visual-validation drives input metrics only.
- [`audit-imported-deps-and-patterns-when-planning.md`](./audit-imported-deps-and-patterns-when-planning.md) — when porting / iterating, run a Pattern Coherence pass at planning time; question every dep and every state-management pattern instead of carrying them forward.

### Skills & orchestration

- [`tech-lead-orchestrator.md`](./tech-lead-orchestrator.md) — operator notes for `/tech-lead-orchestrator`: artefact layout under `runs/<run-id>/`, how to read `journal.md.jsonl`, common debugging recipes (double auto-chain, unparseable verdict, spec mutation, hook failure), dogfooding expectations.
- [`orchestrator-dispatch-hygiene.md`](./orchestrator-dispatch-hygiene.md) — sub-agent dispatch knobs: pin `model: 'opus'` on implementation rounds; `isolation: "worktree"` for ≥4-commit rounds (and verify it took); escalate on lack-of-progress not a retry count; briefs say `biome check` not `biome lint`; verdict claims about routing/auth name the stage.
- [`fresh-prod-bootstrap-503.md`](./fresh-prod-bootstrap-503.md) — a freshly-deployed pragma prod returns `503 auth-not-bootstrapped` on every API route until you `POST /api/admin/set-password` once; `read -rsp` keeps the secret off-screen; in prod the API is same-origin (no `-api` subdomain).
- [`ultimate-guitar-scraping-cgu.md`](./ultimate-guitar-scraping-cgu.md) — UG's CGU §2.6 forbids scraping; sanctioned chord-chart import is manual paste / file upload / OCR-assist, and metadata enrichment goes through MusicBrainz.
- [`github-api-direct-calls-return-403.md`](./github-api-direct-calls-return-403.md) — the proxy answers a direct `api.github.com` call with 403 and a JSON body carrying no `total_count`, so a polling loop doing `?? 0` reads *the request failed* as *there are zero checks*; use the `mcp__github__*` tools, and never default a missing count.
- [`free-chord-grid-sources.md`](./free-chord-grid-sources.md) — the three open corpora that between them cover two thirds of a working repertoire (ChoCo CC BY, Chordonomicon CC BY-NC, lmd_chords), why a "freer site" never helps for chords-with-lyrics, and the notation traps that silently corrupt a grid: `-` is a flat in music21 and a minor in iReal, a Spotify track id names a recording rather than a song, and iReal stores artists as `Lastname Firstname`. Also covers deriving chords from a Deezer preview with librosa, and why that is a draft rather than a transcription.

### Browser / forms

- [`ios-files-picker-uti-greys-extensions.md`](./ios-files-picker-uti-greys-extensions.md) — iOS Files filters file inputs by Apple UTI, not by extension or MIME. `.gpx` and other unregistered extensions are greyed out when `accept` lists them; drop `accept` and validate server-side.

### Fonts / typography

- [`major-mono-display-monocase-vs-uppercase.md`](./major-mono-display-monocase-vs-uppercase.md) — Major Mono Display ships two glyph families; `text-transform: uppercase` is mandatory for the decorative caps-geo variant the design preset usually wants.

### Vendored React components

- [`react-bits-galaxy-mouse-events-vs-touch.md`](./react-bits-galaxy-mouse-events-vs-touch.md) — react-bits Galaxy listens on `mousemove` only; touch is silently broken on mobile. Swap to `pointermove`/`pointerleave` + `touch-action: none` on the container; also set `pointer-events: auto` if a parent has `none`.

### pragma / MusicBrainz

- [`musicbrainz-search-parser-and-missing-tonality.md`](./musicbrainz-search-parser-and-missing-tonality.md) — the default Lucene parser misses what a person actually types, so the adapter asks for `dismax`; and key/tonality lives only on `work` entities, never on the `recording` a search returns, so it cannot be enriched from here.

### Frontend / React

- [`tailwind-v4-fails-quietly-in-two-places.md`](./tailwind-v4-fails-quietly-in-two-places.md) — a `var()` in an `@theme` entry resolves against `:root`, and a variant bracket opening on a bare word compiles to nothing.
- [`rolled-our-own-data-fetching-instead-of-tanstack-query.md`](./rolled-our-own-data-fetching-instead-of-tanstack-query.md) — the cost of writing custom `useStandingsPoll` / `useResource` hooks instead of TanStack Query: each new bug found in our hooks (the PR #23 polling storm) would've been a library author's problem already. Migration sketch when the data layer needs to grow.
- [`svg-preserveaspectratio-distorts-non-uniform.md`](./svg-preserveaspectratio-distorts-non-uniform.md) — `preserveAspectRatio="none"` distorts circles into ellipses when the container aspect ≠ viewBox aspect. Default (`xMidYMid meet`) preserves and letterboxes. Now enforced in pragma by the `no-circle-in-non-uniform-svg.grit` Biome plugin (see [`../dantotsus/circle-went-oval-in-a-stretched-svg-again.md`](../dantotsus/circle-went-oval-in-a-stretched-svg-again.md)).
- [`dnd-kit-pointersensor-loses-touch-to-page-scroll.md`](./dnd-kit-pointersensor-loses-touch-to-page-scroll.md) — a single `PointerSensor` loses touch-drag to native page scroll on phones; split into `MouseSensor` (6px distance) + `TouchSensor` (200ms delay) + `KeyboardSensor`, and `touch-none` on the handle.
- [`debug-client-state-reverts-in-the-browser-first.md`](./debug-client-state-reverts-in-the-browser-first.md) — when the server is right but the UI reverts, reproduce in a real browser and diff the write's request body against the next read's response *before* theorizing; don't ship a fix you never watched fail then pass.

### last-loop-lepin app domain

- [`race-end-signal-duality.md`](./race-end-signal-duality.md) — two end-of-race signals (`edition.status === 'finished'` admin intent, `standings.raceEnded` engine truth) and which call sites should consume which.

### borsouvertures / chess libraries

- [`lichess-openings-dataset-identity-and-matching.md`](./lichess-openings-dataset-identity-and-matching.md) — the source reuses one name across several lines, so identity needs the move sequence; and a `FAMILIES` entry that matches nothing shrinks the dataset silently (prefix shadowing, typographic apostrophe).
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
