# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [17:40] `main` the doc-link checker is at scripts/docs/check-doc-links.ts but CLAUDE.md names it check-doc-links.ts, so the obvious invocation from the repo root fails with ERR_MODULE_NOT_FOUND naming a path that never existed
- [17:40] `main` no skill or doc says where a spec's relative links to docs/adr/ should point from docs/features/<app>/<slug>/spec/, so the depth is guessed and only the link checker catches it
- [17:42] `main` feature-pipeline.md tells stage 1 to read the spec's 'Architectural choices' table, but the specification skill's template.md has no such section, so every spec this repo produces is missing the thing the pipeline is told to read
- [17:42] `main` orchestrator-dispatch-hygiene.md and feature-pipeline.md both mandate 'biome check' in dispatch briefs, but ADR-0007 replaced Biome with ESLint plus Prettier, so the mandated gate name no longer exists in the repo
- [17:42] `main` CLAUDE.md says the Dynamic Workflow lives at .claude/workflows/feature-pipeline.js but the .claude/workflows directory does not exist, so /feature-pipeline is always a first-run generation
- [17:45] `plan` the orchestrator brief named the pragma workspace filter as @borso/pragma but the package is @borso-app/pragma, so the handed-down gate command matches no project
- [17:46] `plan` the technical-conception template.md still prescribes 'pnpm exec biome lint' in its code-quality and pre-flight sections although ADR-0007 replaced biome with eslint plus prettier
- [17:48] `plan` mounting a gated Hono sub-router that carries .use('*') at the same prefix as a public sub-router silently gates the public routes whenever the gated one is mounted first, and nothing in the router type or the composition root records that the order is load-bearing
- [20:14] `validate-tech-01` the technical-validation standard still tells the validator to run biome lint and the no-type-assertion Biome plugin, which ADR-0007 removed from the repo
- [20:17] `validate-tech-01` the validation brief names the composite gate as pnpm --filter @borso/pragma run test, and that filter matches no project because the workspace is @borso-app/pragma
- [20:33] `validate-tech-01` two tests carry the name of the spec case they were asked to pin and a body that never sets that case up, and nothing in the repo can tell a vacuous test from a real one
- [20:33] `validate-tech-01` a service function reachable only through a smoke test asserting 'not 401' counts as covered by every gate here, including the 100% per-file coverage run, because the file carries no gated suffix
- [21:16] `validate-tech-02` the validation brief named the pragma workspace as @borso/pragma, a filter that matches no project in this repo
- [21:27] `validate-tech-02` running db:generate from apps/pragma writes an untracked meta/meta folder and a fresh 0000 migration, so the plan's no-new-migration check cannot mean what it says
- [21:27] `validate-tech-02` the audience back-e2e suite spends thirty real seconds inside one test, so the whole pragma run takes three minutes to tell a validator anything
- [22:21] `validate-tech-03` the validation brief named the pragma workspace @borso/pragma, which matches no project, while the package is @borso-app/pragma
- [22:29] `validate-tech-03` a front end can add a custom request header with nothing anywhere noticing that the API Gateway CORS allow-list does not carry it, and the gap only shows in the one stage whose origins differ
- [22:29] `validate-tech-03` judging any CORS or same-origin property meant reading four files across two workspaces because no single artefact states which stage serves /api from the site origin
- [23:00] `validate-tech-04` pnpm run db:generate in apps/pragma emits a fresh 0000 migration and an untracked meta/ folder because the drizzle journal is not committed, so the plan's gate that db:generate must leave the migrations folder unchanged cannot hold and the validator has to clean up after running it
- [23:11] `validate-tech-04` the technical-validation standard and skill still tell the validator to run biome lint and cite the biome config in three places, while ADR-0007 replaced biome with ESLint plus Prettier, so the brief has to correct the skill it invokes
- [23:15] `validate-visual-04` scripts/browser.sh only accepts --restart as the very first argument, and putting it after --session <name> fails with 'Unknown command: --restart'
- [23:20] `validate-visual-04` an agent-browser ref for a pool row goes stale within a second because the row's accessible name carries the live vote count and the countdown, so click-by-ref loses the race against the one-second poll
- [23:22] `validate-visual-04` each scripts/browser.sh call costs about two and a half seconds of pnpm exec startup, so a thirty-second round only affords about eight browser commands and a multi-step flow has to be split across several rounds
- [23:46] `validate-visual-04` an agent-browser session context wedged into CDP timeouts after roughly forty page drives, and before it stopped answering at all it left a React mutation stuck pending so a button read as permanently disabled, which looks exactly like an application defect
- [23:58] `validate-visual-04` kaizen.sh archive still cp-overwrites the feature's kaizen.md, so the eight entries two earlier agents had archived had to be merged back in by hand before this round's could be added
- [07:40] `revalidate-visual` agent-browser find rejects --name placed before the action but its own help prints the option list under a Usage line that puts [action] last, so the working order is not readable from the help
- [07:43] `revalidate-visual` agent-browser silently discards a session's page and globals when a later call to the same --session omits a launch flag such as --init-script, so the next eval fails with ReferenceError and a SecurityError on about:blank rather than naming the flag mismatch
- [07:58] `revalidate-visual` an agent-browser session wedged after roughly fifty page drives so a reload never returned and the panel rendered with every query empty, which reads as an application defect until a daemon restart shows otherwise
- [08:07] `revalidate-visual` agent-browser batch re-parses each quoted command string and strips inner quotes, so eval __vote.vote('Wonderwall') reaches the page as vote(Wonderwall) and fails with ReferenceError while the same eval outside batch works
- [08:07] `revalidate-visual` consecutive agent-browser eval calls share one script scope, so a second call declaring the same const dies with Identifier already declared rather than evaluating
- [08:07] `revalidate-visual` pragma's POST /api/__test/seed returns adminPassword pragma-preview together with adminCredentials already-set, so a re-seeded database hands back a password that the login route then refuses
- [08:07] `revalidate-visual` the audience song search returns in under a second through curl but takes six to seven seconds to render in the page, which does not fit the thirty-second round a suggestion has to be made inside
- [08:30] `revalidate-visual` the local pragma Postgres is shared, so another agent running the seed mid-run wiped every voting_round row and replaced the concert id the validation was driving, which surfaces as a 404 on a public route rather than as a collision
- [08:42] `revalidate-visual` an agent-browser page stopped completing its fetches after about forty drives and the panel froze mid-round showing TIME LEFT 0s with the request log recording two polls where thirty were due, which is indistinguishable from a poll that stopped early until the daemon is restarted
- [11:04] `main` the GitHub MCP sanitizer defuses any PR-body link ending in .png or .gif, so a PR cannot embed the screenshots and GIFs the open-pr standard asks for, and the workaround costs a round-trip nobody would run without the hook
- [11:04] `main` the ffmpeg Playwright ships in /opt/pw-browsers is a webm-only build with no PNG decoder and no GIF encoder, so it cannot turn captured frames into a GIF and the failure reads as a missing pattern_type option
- [08:18] `main` Deezer answers 200 with an error body for an unknown track and for a quota refusal; a transport-only check reads both as a successful empty answer
- [08:18] `main` one external_search_cache table keyed on the normalised query alone silently served a Deezer row to the MusicBrainz reader, which parses it to an empty list rather than throwing
- [08:55] `main` Deezer returns five separately-identified masters of one recording under one title and artist; the ISRC collapse cannot see them, and each would have taken its own share of the room's vote
