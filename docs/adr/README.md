# Architecture Decision Records (ADR)

The audit trail of *why the code looks the way it does*. Each ADR pins a
single non-trivial design choice: what we picked, what we considered,
what the criteria were, and what it costs us.

ADRs sit between the spec ("what we want") and the plan's `How each
decision becomes code` table ("where it lands"). A plan row that says
"we chose X instead of Y because Z" deserves an ADR. The alternatives
+ criteria + justification go here, not in a commit message or a code
comment that rots.

Conventions live in [`.claude/skills/adr/standard.md`](../../.claude/skills/adr/standard.md).
Drafting is `/adr`. The skill has two entry modes (see
[`.claude/skills/adr/SKILL.md`](../../.claude/skills/adr/SKILL.md)):
the interactive decision-support walk when a human invokes it, or a
piloted mode that takes a pre-built payload when
`/tech-lead-orchestrator` calls it.

## Status lifecycle

- **proposed**. drafted, not yet shipped. Default on creation.
- **accepted**. merged into main. Stamped by `/after-task-kaizen`.
- **superseded by ADR-<id>**. replaced. Forward link mandatory; old
  file stays for audit.
- **deprecated**. surrounding system is gone; preserved as historical.

ADRs are append-only. Ids are never recycled, even after supersession.

A new record is named after the UTC minute it was written,
`YYYY-MM-DDTHHMM-<slug>.md`, for example `2026-11-11T1318`, so
branches open at the same time never take the same id. The records
written before that change were numbered `0001` to `0052`; they were
renamed to the UTC minute of the commit that added them, keeping the date
their header states.

## When to write one

Yes:
- A trade-off with at least two viable options.
- A choice driven by a constraint that future readers will not
  immediately understand from the code.
- A `/technical-conception` plan row whose decision deviates from the
  default repo conventions.

No:
- Reversible-at-zero-cost choices (renaming, formatting).
- Reasoning already captured verbatim in `CLAUDE.md` or a
  `docs/knowledge/` entry. Cross-link instead.

## Index

<!-- New entries go under the right heading. If no heading fits, add
     one. Manually curated. `/adr` never reorders existing entries.
     scripts/check-adr-numbers-resolve.sh refuses a record with no row and
     a row with no record; it had drifted by nine of twenty before it ran. -->

| # | Title | Status | Date |
|---|---|---|---|
| [2026-05-13T1510](./2026-05-13T1510-tech-lead-orchestrator-replaces-auto-chain.md) | `/tech-lead-orchestrator` replaces the linear skill auto-chain | accepted | 2026-05-13 |
| [2026-05-14T1300](./2026-05-14T1300-vendor-react-bits-galaxy-shader.md) | Vendor the react-bits Galaxy WebGL shader instead of installing it | superseded by [2026-05-14T1341](./2026-05-14T1341-react-bits-galaxy-as-react-component.md) | 2026-05-14 |
| [2026-05-14T1341](./2026-05-14T1341-react-bits-galaxy-as-react-component.md) | Mount the react-bits Galaxy as a React component on top of `ogl` | accepted | 2026-05-14 |
| [2026-05-19T1955](./2026-05-19T1955-pragma-shared-password-auth.md) | Shared-password auth for the pragma band ERP | superseded by 2026-09-14T1903 | 2026-05-19 |
| [2026-06-05T2337](./2026-06-05T2337-dynamic-workflows-for-orchestration.md) | Dynamic Workflows for the tech-lead orchestration pipeline | accepted | 2026-06-05 |
| [2026-06-06T1326](./2026-06-06T1326-cascade-on-delete-via-json-blob-scrub.md) | Cascade-on-delete via JSON-blob scrub (DSQL no-FK substitute) | accepted | 2026-06-06 |
| [2026-08-08T1538](./2026-08-08T1538-eslint-with-type-aware-rules-replaces-biome.md) | ESLint with type-aware rules replaces Biome | superseded by 2026-10-27T2320 | 2026-08-08 |
| [2026-08-08T1539](./2026-08-08T1539-purity-enforced-structurally.md) | Purity is enforced by file location, not by review | accepted | 2026-08-08 |
| [2026-08-09T1654](./2026-08-09T1654-pragma-previews-clone-production.md) | pragma previews clone production, credentials included | accepted | 2026-08-09 |
| [2026-08-13T0026](./2026-08-13T0026-pragma-domain-folder-for-cross-boundary-rules.md) | A `domain/` folder for the rules pragma's two sides share | accepted | 2026-08-13 |
| [2026-08-14T1116](./2026-08-14T1116-elk-lays-out-the-architecture-graph-at-generation-time.md) | ELK lays out the architecture graph at generation time | accepted | 2026-08-14 |
| [2026-08-15T0234](./2026-08-15T0234-outbound-calls-live-in-adapter-files.md) | Every outbound call lives in an `.adapter.ts` file | accepted | 2026-08-15 |
| [2026-08-15T0958](./2026-08-15T0958-input-schemas-carry-the-coverage-gate.md) | `.schema.ts` carries the coverage gate | accepted | 2026-08-15 |
| [2026-08-20T1031](./2026-08-20T1031-generated-files-are-not-committed.md) | Generated files are not committed | accepted | 2026-08-20 |
| [2026-09-14T1903](./2026-09-14T1903-per-member-credentials-replace-the-shared-password.md) | Per-member credentials replace the shared password, behind a self-closing enrolment window | accepted | 2026-09-14 |
| [2026-09-14T1904](./2026-09-14T1904-simplewebauthn-carries-the-passkey-flow.md) | `@simplewebauthn` carries the passkey flow, as an alternative single factor | accepted | 2026-09-14 |
| [2026-09-15T2023](./2026-09-15T2023-spotify-track-ids-resolved-by-isrc-at-link-time.md) | Spotify track ids resolved by ISRC at link time, credential in SSM | accepted | 2026-09-15 |
| [2026-09-15T0015](./2026-09-15T0015-nominatim-answers-the-bar-search.md) | Nominatim answers the bar search, proxied through the API | accepted | 2026-09-15 |
| [2026-09-16T1931](./2026-09-16T1931-the-room-search-collapses-masters-into-songs.md) | The room's search collapses masters into songs, and reads a refusal stated inside a 200 | accepted | 2026-09-16 |
| [2026-08-26T1739](./2026-08-26T1739-qrcode-react-for-the-audience-vote-qr-code.md) | `qrcode.react` renders the audience-vote QR code | deprecated | 2026-08-26 |
| [2026-09-18T2339](./2026-09-18T2339-instruments-carry-their-own-icon-order-and-primacy.md) | Instruments carry their own icon, order and primacy | accepted | 2026-09-18 |
| [2026-09-19T2140](./2026-09-19T2140-api-gateway-websocket-pushes-banana-rush-round-state.md) | API Gateway WebSocket pushes Banana Rush round state | accepted | 2026-09-19 |
| [2026-09-21T0819](./2026-09-21T0819-validation-screenshots-leave-git-for-the-previews-cdn.md) | A passing validation's screenshots go to the previews CDN; a FAIL row's stay in git | accepted | 2026-09-21 |
| [2026-10-05T1023](./2026-10-05T1023-the-harness-ships-as-a-plugin-linked-into-claude.md) | The harness ships as a plugin and is linked into .claude/ part by part | superseded by [2026-11-05T0106](./2026-11-05T0106-the-harness-lives-in-claude-with-no-plugin.md) | 2026-10-05 |
| [2026-10-06T2302](./2026-10-06T2302-talos-deploys-to-prod-only.md) | talos deploys to prod only, and an app can opt out of previews | accepted | 2026-10-06 |
| [2026-10-12T0032](./2026-10-12T0032-tailwind-merge-resolves-class-conflicts.md) | tailwind-merge resolves conflicting classes in composeClassName | accepted | 2026-10-12 |
| [2026-10-10T0141](./2026-10-10T0141-weak-point-management-from-the-dantotsu-record.md) | Weak point management reads the dantotsu record, made checkable | accepted | 2026-10-10 |
| [2026-10-10T0122](./2026-10-10T0122-knowledge-is-delivered-by-trigger.md) | Knowledge is delivered by trigger, and an entry without one is not written | accepted | 2026-10-10 |
| [2026-10-10T0457](./2026-10-10T0457-pragma-reports-errors-and-traces-to-sentry-eu.md) | pragma sends errors and traces to Sentry's EU region with personal data collection off | accepted | 2026-10-10 |
| [2026-10-12T2337](./2026-10-12T2337-impeccable-is-vendored-as-a-project-skill.md) | impeccable is vendored as a project skill, without its edit hook | accepted | 2026-10-12 |
| [2026-10-02T1351](./2026-10-02T1351-one-database-role-per-stage-schema.md) | One database role per stage schema, and API Lambdas lose admin access | accepted | 2026-10-02 |
| [2026-10-02T1352](./2026-10-02T1352-calendar-feed-address-in-its-own-table.md) | A member's calendar feed address is plain text in its own table, write-only through the API | accepted | 2026-10-02 |
| [2026-10-02T1353](./2026-10-02T1353-ical-js-parses-calendar-feeds.md) | `ical.js` parses the members' calendar feeds | accepted | 2026-10-02 |
| [2026-10-16T0716](./2026-10-16T0716-talos-memory-in-the-database.md) | The talos memory moves into the database, behind an agent API | accepted | 2026-10-16 |
| [2026-10-23T0932](./2026-10-23T0932-pragma-sends-web-push-like-talos.md) | pragma sends Web Push the way talos does, inline from the API with one VAPID pair per stage | accepted | 2026-10-23 |
| [2026-10-23T0227](./2026-10-23T0227-pragma-serves-mcp-from-its-api-lambda.md) | pragma serves MCP from its API Lambda, stateless, with the official SDK behind @hono/mcp | accepted | 2026-10-23 |
| [2026-10-23T0228](./2026-10-23T0228-pragma-is-its-own-oauth-authorization-server.md) | pragma is its own OAuth 2.1 authorization server, and an assistant signs in through the member's existing session | accepted | 2026-10-23 |
| [2026-10-24T0932](./2026-10-24T0932-one-catalogue-song-per-deezer-track-by-unique-index.md) | One catalogue song per Deezer track, held by a unique index on song.deezer_track_id | accepted | 2026-10-24 |
| [2026-10-25T0054](./2026-10-25T0054-read-only-production-database-access-for-agents.md) | Agents read production through a SELECT-only database role | superseded by 2026-10-28T2126 | 2026-10-25 |
| [2026-10-27T2320](./2026-10-27T2320-oxlint-and-oxfmt-replace-eslint-and-prettier.md) | oxlint and oxfmt replace ESLint and Prettier | accepted | 2026-10-27 |
| [2026-10-27T2321](./2026-10-27T2321-typescript-7-replaces-typescript-5-9.md) | TypeScript 7 replaces TypeScript 5.9 | accepted | 2026-10-27 |
| [2026-10-27T1115](./2026-10-27T1115-pragma-design-system-is-notebook-with-grafts.md) | pragma's design system is the Notebook direction, with Backstage's buttons and six other grafts | accepted | 2026-10-27 |
| [2026-10-27T1116](./2026-10-27T1116-newsreader-replaces-instrument-serif.md) | Newsreader replaces Instrument Serif, self-hosted with its weight and optical size axes | accepted | 2026-10-27 |
| [2026-10-28T2126](./2026-10-28T2126-agents-read-production-through-an-invoked-reader-lambda.md) | Agents read production through a reader Lambda invoked by the AWS API, not port 5432 | accepted | 2026-10-28 |
| [2026-10-27T1117](./2026-10-27T1117-a-task-names-an-optional-session.md) | A task names an optional session through a nullable `task.session_id` | accepted | 2026-10-27 |
| [2026-10-27T1118](./2026-10-27T1118-chord-text-from-paste-and-pdf-text-layer-photos-stay-images.md) | Chord text comes from pasted text and a PDF's text layer; a photo stays an image | accepted | 2026-10-27 |
| [2026-10-29T1115](./2026-10-29T1115-pragma-previews-clone-takes-and-read-their-audio-from-production.md) | pragma previews clone takes and read their audio from the production uploads bucket | accepted | 2026-10-29 |
| [2026-10-29T1139](./2026-10-29T1139-pragma-runs-a-daily-job-on-eventbridge-scheduler-in-paris-time.md) | pragma's daily job runs on EventBridge Scheduler in Paris time and invokes the API Lambda | accepted | 2026-10-29 |
| [2026-11-01T1313](./2026-11-01T1313-pragma-offline-reads-through-the-query-cache.md) | Pragma reads offline from the persisted query cache, and its service worker keeps only the shell and push | accepted | 2026-11-01 |
| [2026-11-03T1438](./2026-11-03T1438-pragma-interactive-primitives-come-from-react-aria-components.md) | pragma's interactive primitives come from React Aria Components | accepted | 2026-11-03 |
| [2026-11-04T0227](./2026-11-04T0227-pragma-pushes-stale-scopes-over-the-websocket-channel.md) | pragma pushes stale scopes over the WebSocket channel | accepted | 2026-11-04 |
| [2026-11-04T1200](./2026-11-04T1200-the-quality-dashboard-is-a-private-artifact-a-session-refreshes.md) | The quality dashboard is a private artifact a session refreshes | accepted | 2026-11-04 |
| [2026-11-05T0106](./2026-11-05T0106-the-harness-lives-in-claude-with-no-plugin.md) | The harness lives in .claude/ with no plugin | accepted | 2026-11-05 |
| [2026-11-05T0445](./2026-11-05T0445-pragma-reads-leave-in-one-batch-per-tick.md) | pragma's reads go out as one batch per tick | accepted | 2026-11-05 |
| [2026-11-11T1306](./2026-11-11T1306-talos-keeps-the-conversation-of-each-routine-run.md) | Talos keeps the conversation of each routine run in a table of its own database | accepted | 2026-11-11 |
| [2026-11-11T1318](./2026-11-11T1318-pragma-api-emits-one-wide-event-per-request.md) | the pragma API emits one wide event per request, to stdout and onto its Sentry span | accepted | 2026-11-11 |
| [2026-11-11T1658](./2026-11-11T1658-lambda-source-maps-go-to-sentry-not-into-the-bundle.md) | Lambda source maps go to Sentry, not into the bundle | accepted | 2026-11-11 |
| [2026-11-11T1903](./2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md) | every app traces to Sentry at sample rate 1.0, and each API's wide event lands on its request span | proposed | 2026-11-11 |

### Data layer

- 2026-06-06T1326. cascade-on-delete via JSON-blob scrub, the substitute for foreign keys DSQL does not enforce.
- 2026-08-09T1654. pragma previews clone production, credentials included.
- 2026-10-02T1351. every stage schema gets its own login role, mapped to that stage's API Lambda; API Lambdas connect with `dsql:DbConnect` and `admin` is left to the migration runner, so a preview can no longer reach production.
- 2026-10-02T1352. a member's secret calendar address is plain text in a table of its own, never returned by the API and blocklisted from preview clones.
- 2026-10-16T0716. the talos memory moves from a private git repository to `memory_*` tables, reached by agents through `/api/agent/*` with one token per environment; the read-only SQL route relies on a keyword guard and a `READ ONLY` transaction rather than a second database role.
- 2026-10-24T0932. one catalogue song per Deezer track is held by a unique index on `song.deezer_track_id`; DSQL builds it asynchronously, and since the PR #193 kaizen the migration runner waits on the build job and fails the deploy when it fails, so the operator still counts prod duplicates before merging but no longer checks `sys.jobs` by hand.
- 2026-10-25T0054. a hosted session reads the `prod` schema of pragma, last-loop-lepin and banana-rush (never talos) through `scripts/db-read.sh`, signed in as `ai_reader_prod`, a role that holds `SELECT` only and is mapped to `AI-Dev-ReadOnly`, which gets `dsql:DbConnect` and never `DbConnectAdmin`; the script's keyword guard and `READ ONLY` transaction are conveniences, because the session controls the script.
- 2026-10-28T2126. the sandbox blocks 5432 and Aurora DSQL has no data API, so `db-read.sh` stops being a Postgres client and calls `aws lambda invoke` on a reader function per app; SigV4 replaces the shared secret the HTTPS shapes would have needed, nothing is published on Internet, and the blocklist moves inside the function where a caller cannot skip it. Supersedes 2026-10-25T0054.
- 2026-10-27T1117. a task names at most one session through a nullable `task.session_id`, claimed in the task's transaction like its song and nulled when the session is deleted; DSQL refuses `DROP COLUMN`, so the column stays for good.
- 2026-10-29T1115. pragma previews clone `take` and `take_comment`; the preview API may `s3:GetObject` on `pragma-prod-uploads/take/*` only, and signs a take's read against production when its own bucket does not hold the key, so a deletion on a preview never reaches production.

### App architecture

- 2026-05-14T1300, 2026-05-14T1341. react-bits Galaxy integration (see table above).
- 2026-05-19T1955. shared-password auth for the pragma band ERP (5 trusted members, daily-use tool, friction dominates over attribution).
- 2026-08-13T0026. a `domain/` folder for the pure rules pragma's front end and back end both read, admitted only with a caller on each side.
- 2026-09-14T1903. per-member credentials replace the shared password (supersedes 2026-05-19T1955); the old secret opens a self-closing enrolment window and nothing else.
- 2026-09-14T1904. `@simplewebauthn` carries the passkey flow, as an alternative single factor beside the password.
- 2026-09-15T2023. a song's Spotify track is resolved once by the ISRC Deezer already returns, and the client credential lives in SSM rather than the database ADR-2026-05-19T1955 chose, because rotation-as-an-endpoint does not apply to a machine credential.
- 2026-09-15T0015. Nominatim answers the bar search, proxied through the API; no key and no billing account, in exchange for a rate limit, a cache and an attribution line the code carries.
- 2026-09-16T1931. the room's search collapses a provider that indexes masters down to one row per song, and reads a refusal Deezer states inside a 200 body.
- 2026-08-26T1739. `qrcode.react` was chosen to render the audience-vote QR code, then **deprecated** when the QR code itself was withdrawn: the audience reaches the vote page by typing a short address that never changes. The library comparison is kept for the day a QR code is genuinely wanted.
- 2026-09-18T2339. the instrument table gained `icon` and `position`, and the member-instrument link gained `is_primary`, so the setlist's lineup column reads its slots and their order from the band's own data rather than from a name-matching table that a typo would break.
- 2026-10-02T1353. `ical.js` parses the members' calendar feeds: no runtime dependency and no fetch of its own, so the SSRF guard stays the only path to an address a member typed.
- 2026-10-12T0032. `composeClassName` runs `clsx` through `twMerge`, so a caller's class overrides a variant's base; a lost override had shipped twice in two pull requests.
- 2026-10-23T0932. pragma sends Web Push with `web-push` inline from the API Lambda, as talos does, with one VAPID pair per stage, generated on first use and kept in the database since its 2026-10-24 revision, and push subscriptions kept out of preview clones.
- 2026-10-23T0227. pragma serves MCP at `/mcp` on its API Lambda, stateless, with `@modelcontextprotocol/sdk` behind `@hono/mcp`; every tool is a schema plus one service call.
- 2026-10-23T0228. pragma is its own OAuth 2.1 authorization server for assistants (discovery, dynamic registration, PKCE S256, rotating refresh tokens), signing members in through their existing session rather than a hosted provider.
- 2026-10-27T1115. pragma's design system is Notebook (paper, one blue ink for actions, pencil and highlighter) with Backstage's pill buttons and six other grafts; the only direction keeping every operator rule and every text pair at AA in both schemes. Members keep their own stored colours, shown as filled lanes in the Lineup grid, with the ink on them chosen by contrast and names in a text token.
- 2026-10-27T1116. Newsreader replaces Instrument Serif with its optical size axis, 278,872 bytes against 43,160, because the ratified screens were drawn with it and notes sit at 14 px.
- 2026-10-27T1118. chord text comes from pasted text and from a PDF's text layer read in the browser by `pdfjs-dist`, loaded on the chord editor only; a photo stays an image because OCR lost the chord columns on the measured sample.
- 2026-11-01T1313. pragma reads offline from TanStack Query's own cache, persisted with `PersistQueryClientProvider`, and its service worker keeps only the shell and push, because a second data cache that writes never updated lost a setlist's order; the cost is two TanStack packages and a browser storage limit the plan measures.
- 2026-11-05T0445. pragma's Hono client folds every read issued in one tick into one `POST /api/read-batch` that one Lambda answers with per-read status, at most 10 reads per batch and 2 in flight per tab, writes never batched and `/api/offline-manifest` deleted, because it holds every route under the reserved concurrency of 10 with no endpoint per screen; grouped reads lose their path in the API Gateway log.

### CDK / infra

- [`2026-09-19T2140-api-gateway-websocket-pushes-banana-rush-round-state.md`](./2026-09-19T2140-api-gateway-websocket-pushes-banana-rush-round-state.md). an API Gateway WebSocket API, wrapped in a new `WebSocketChannel` construct, pushes lobby and round state to the phones playing Banana Rush; chosen over polling and over streamed Lambda responses because it delivers a simultaneous reveal and bills per message and per connection minute with no fixed charge.
- 2026-10-06T2302. talos deploys to prod only; an app opts out of previews with `"borso": { "previews": false }`, because a talos preview would serve private content on a public host.
- 2026-10-29T1139. pragma's 20:00 streak reminder runs on EventBridge Scheduler in `Europe/Paris`, production only, and invokes the API Lambda with a fixed payload, so the time holds across daylight saving and the job reuses the API's DSQL role; the cost is a second event shape on the API entry point.
- [`2026-11-11T1658-lambda-source-maps-go-to-sentry-not-into-the-bundle.md`](./2026-11-11T1658-lambda-source-maps-go-to-sentry-not-into-the-bundle.md). a Lambda API uploads its source map to Sentry at bundling time and deletes it from the asset once the upload succeeded, instead of carrying 13.7 MB that Node parses on every cold start; chosen over simply dropping the map because minified frames make a production exception a guess, and the cost is `@sentry/cli` in every full-stack deploy.

### Harness

- 2026-10-05T1023, superseded by 2026-11-05T0106. the skills, validator agents, feature-pipeline command and guard hooks ship as the `borso-harness` plugin under `plugins/`, and each part is linked into `.claude/` with its hooks declared in `.claude/settings.json`, because a cloud session skips both a declared marketplace and a plugin under `.claude/skills/` as untrusted.
- 2026-11-05T0106. the harness lives in `.claude/` as plain files and the `borso-harness` plugin is deleted, because talos moved into `apps/` and the plugin had no other consumer; a repository outside borso.fr can no longer install it.
- 2026-10-10T0122. every knowledge entry declares `triggers:` (paths, commands, output), `knowledge-triggers.sh` prints the matching entry into the agent's context at that moment, and a gate refuses an entry without one, because entries were read only when a hook printed them.
- 2026-10-12T2337. the third-party impeccable design skill and its four agents are copied verbatim into `.claude/` at a pinned upstream commit, because a cloud session loads a plain skill folder and skips a marketplace; its edit hook is left out so sessions that do no design work pay nothing.

### Observability

- 2026-11-04T1200. the 3S quality dashboard is a private claude.ai artifact a session refreshes on request, reading Sentry and pragma through its MCP connections and CloudWatch with its AWS read keys, because the CI version needed three new credentials and published the numbers publicly.

- 2026-10-10T0457. pragma sends browser and API errors and one end-to-end trace per request to Sentry's free plan in the EU region, with every personal data category off; database spans wait on a bundling change.

- 2026-11-11T1306. each successful fire of the talos routine is one row of `routine_run` in the app's own database, with the Claude Code address the fire answered, kept only under `https://claude.ai/code/`; the HTTP answer alone lost it on reload and the memory files would have changed the agent's contract.
- 2026-11-11T1318. the pragma API emits one wide event per request, built by a Hono middleware over `AsyncLocalStorage`, written as one JSON line to stdout and as attributes on the Sentry request span, with `member.id`, no sampling and `console.*` banned by lint.

- 2026-11-11T1903. every app traces to Sentry at sample rate 1.0 with pragma's request span and browser tracing, and each API's wide event lands on its span, because the measured worst case is 2.8M spans a month against the free plan's 5M.

### Tooling / DevX

- 2026-05-13T1510. `/tech-lead-orchestrator` replaces the linear skill auto-chain.
- 2026-06-05T2337. Dynamic Workflows as the orchestration substrate (supersedes 2026-05-13T1510's runtime, not its intent).
- 2026-08-08T1538. ESLint with type-aware rules replaces Biome; the cost is a 23× slower cold lint, the benefit is every rule the standards name. Superseded by 2026-10-27T2320.
- 2026-10-27T2320. oxlint replaces ESLint and oxfmt replaces Prettier; every rule keeps running, natively, through tsgolint, or as the upstream ESLint rule loaded as a JavaScript plugin, and the lint and format checks return to the commit, except the type-aware rules, which run on push and in CI.
- 2026-10-27T2321. TypeScript 7.0.2 is the only TypeScript: every type check and the `infra/cdk` build run it; the architecture model parses with `oxc-parser` and the rule suites run on oxlint's `RuleTester`.
- 2026-08-08T1539. purity enforced by file location through three custom rules, with "condition" narrowed to mean a decision.
- 2026-08-14T1116. ELK lays out the architecture graph at generation time; edges through unrelated nodes go from 72/125 to 0/125 and the page still ships no layout engine.
- 2026-08-20T1031. generated files are not committed; `--check` validates rather than compares, and `pages.yml` publishes each output so it keeps an address.
- 2026-09-21T0819. a passing validation's screenshots go to the previews CDN and expire after 60 days, while a FAIL row's stay committed; screenshots were 82% of `.git`.
- 2026-10-10T0141. weak point management reads the dantotsu front matter, made checkable by a schema gate; `zone:` is chosen by hand, and the weekly count comes from the entries' dates, so no new writer and no cron.

## How `/open-pr` uses ADRs

The PR description's `## Architecture choices` section embeds each ADR
referenced in the diff. The ADR's *Decision* paragraph sits at level 1
(always visible); its *Alternatives considered* + *Evaluation rubric*
sit at level 2 (`<details>`); its *Implementation pointers* sit at
level 3 (nested `<details>`). The skill at
[`.claude/skills/open-pr/SKILL.md`](../../.claude/skills/open-pr/SKILL.md) carries the
exact mapping.
