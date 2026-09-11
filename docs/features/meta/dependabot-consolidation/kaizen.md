# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [11:51] `main` a @hono/zod-validator minor (0.4 to 0.9) typed the 400 validation body into the response union, so every mutation's response.json() went any and lint failed with 24 unsafe-access errors that named the queries, not the dependency
- [11:51] `main` isResponseSuccessful returned boolean rather than a type predicate, so nothing narrowed the hono response union once it had more than one member
- [11:51] `main` eslint --cache kept reporting 24 type-aware errors after the fix; only rm .eslintcache cleared them, because the cache keys on file content and these errors came from another package's types
- [12:06] `main` scripts/argent.sh hardcodes --no-proxy-server and strips HTTPS_PROXY, so its Chromium cannot reach an https preview at all: every navigation lands on ERR_CERT_AUTHORITY_INVALID, which reads as a broken certificate on the preview rather than a flag meant for localhost
- [12:10] `main` argent gesture-swipe is explicitly not supported on Chromium (its own tools describe says so and directs you to gesture-scroll), so the documented phone pass can send real taps but no real touch swipe or touch drag to a web preview; a silent no-op result reads as the app ignoring the gesture
