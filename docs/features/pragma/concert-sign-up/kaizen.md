# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: 78a9cee8-6ad7-5552-b015-d73d4b1ef7ca

- [2026-11-26 09:35] `api-agent` The contract named a new request header but not domain/request-headers.core.ts, the registry CloudFront and CORS forward from, so the PATCH would have 403d in prod with every test green.
- [2026-11-26 09:35] `api-agent` A new pragma API slice must also be registered in three structural gates (stale-scope roots, derived read roots, MCP tool exclusions) that no brief or blueprint names, found only by the full core run.
- [2026-11-26 09:35] `main` I launched two build agents in the shared checkout without running /route, which asks for isolation worktree for parallel builds; that is why the Stop hook kept firing.
- [2026-11-26 09:40] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-26 09:44] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-26 09:47] `site-agent` The default 5-minute query stale time plus the persisted cache hid a just-saved public message and a fan-wish song from the next page load, found only in the browser.
- [2026-11-26 09:47] `site-agent` Only one Invariants file per vocabulary term, so a feature split across api and site folders needs a separate site-side term, learned from the vocabulary gate after writing three INVARIANTS sections.
- [2026-11-26 10:02] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-26 10:07] `technical-validator` The concert-sign-up spec has a third shape (Use cases and Rules, no Behaviour, Test strategy or Changes) that neither the short-form nor the ADR procedure of the validator describes, so category D routing to /visual-validation had to be improvised.
- [2026-11-26 10:43] `fix-agent` Exporting a shared constant from domain/ made the no-api-declaration-repeated-in-site rule flag four untouched site files, only discovered at lint time, because nothing lists where a constant is copied before you move it.
- [2026-11-26 10:43] `fix-agent` check-vocabulary-paths refuses an INVARIANTS section whose heading is not a VOCABULARY term, which a rule about the rate limit of public writes needed, and the message arrives only after writing it.
- [2026-11-26 10:53] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-26 13:00] `main` The follow-up sheet mockup read 'C'est noté, Camille ! / Facultatif / Tu viens pour qui ?': a bare 'Facultatif' label and a question with no context left the fan unsure what was asked and why.
- [2026-11-26 13:02] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-26 14:00] `main` Mockup boards edited by regex were published without rendering them, so a broken desktop layout and an overlapping date reached the operator twice.
- [2026-11-26 14:34] `build-agent` The local dev API answers 500 on /upcoming as soon as a concert has a poster key, because no bucket is configured to sign it, so the poster layout cannot be checked locally without patching fetch.
- [2026-11-26 14:34] `build-agent` agent-browser network route cannot mock a read that pragma sends through the POST read-batch, so faking one answer needed an init script that rewrites fetch and a fresh browser session.
- [2026-11-26 14:34] `build-agent` react-aria RadioButton silently ignores aria-label, so the four prize icon radios had no accessible name until a sr-only span was added.
- [2026-11-26 14:40] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-26 14:51] `visual-validator` agent-browser fill @ref with an empty string printed Done but left a controlled input unchanged, so a clear-and-save test looked like a save that ignored empty fields.
- [2026-11-26 14:51] `visual-validator` The poster upload returns 500 UPLOADS_BUCKET not set under the local dev server, so every poster row needs a routed response or a preview.
- [2026-11-26 14:54] `technical-validator` vitest --changed did not select site/src/lib/design-tokens.utils.test.ts though tokens.css and class-name.utils.ts changed, so the validator ran it by name
- [2026-11-26 14:54] `technical-validator` Retract the previous technical-validator line: design-tokens.utils.test.ts did run under --changed; the validator misread its own log before checking it
- [2026-11-26 15:02] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-26 15:11] `fix2-agent` A jsdom File passed as a Request body in a pragma site test throws in vitest's makeCompatBlob, so a presigned PUT cannot go through stubFetch and the upload adapter has to be mocked instead.
- [2026-11-26 15:11] `fix2-agent` The visual validator named row 26's symptom but not its cause; a ConcertSignUpCard seeded from useState at mount kept the persisted cache's previous concert state, which a key per concert would have caught at review.
- [2026-11-26 16:21] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-26 16:26] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-26 16:26] `perforation-agent` agent-browser screenshot with a relative path writes into the daemon's cwd (another agent's folder), not the caller's cwd, so screenshots must use absolute paths.
- [2026-11-26 16:26] `perforation-agent` Setting a poster_s3_key on the local dev database makes GET /api/concert-registrations/upcoming answer 500 because minting the poster URL needs AWS, so the poster layout can only be checked locally by rewriting the read-batch answer in an init script.
- [2026-11-26 16:26] `perforation-agent` no-arbitrary-tailwind-value bans rounded-[...], so a child radius that must sit flush inside a bordered card needs new radius tokens in tokens.css and RADIUS_TOKENS.
- [2026-11-26 16:55] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-26 16:55] `trim-agent` The brief pointed to build-agent/notes.md for the browser conversion recipe, but that file did not exist; only build-agent/convert.js held it.
- [2026-11-26 16:59] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-26 18:46] `onescreen-agent` Fitting the concert ticket into one phone screen needs hand-measured pixel totals in a calc, because the venue and prize label heights depend on how their text wraps and CSS cannot subtract sibling heights.
- [2026-11-26 19:28] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-26 19:39] `visual-validator` Local pnpm dev presigns poster uploads with the AI-Dev-ReadOnly key, so S3 refuses the PUT and a poster replace cannot be validated outside a preview, and a removed seeded poster cannot be restored without reseeding.
- [2026-11-26 19:39] `visual-validator` agent-browser fill with an empty string left a controlled textarea's value unchanged, so the first clear of the ERP public message silently saved the old text.
- [2026-11-26 19:41] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-26 19:48] `hook:merge-strands-no-work` merged with uncommitted or stashed work in the container
- [2026-11-26 19:51] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-26 19:59] `remove-agent` oxlint conditions-live-in-pure-functions flags 'if (response.status === GONE)' in a .queries.ts but not setlists.queries.ts's 'response.status === MISSING_STATUS || !response.ok', so the rule's reach is unpredictable and forced a one-line core helper
- [2026-11-26 19:59] `remove-agent` the no-prettier hook refuses a whole chained Bash call, so the python edit earlier in the same call silently did not run either
- [2026-11-26 19:59] `hook:merge-strands-no-work` merged with uncommitted or stashed work in the container
- [2026-11-26 20:08] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-26 20:09] `technical-validator` The concert-sign-up spec has Use cases and Rules sections only, a shape neither the full template nor the short form in the validator definition describes, so category A and D rows had to be built by analogy.
- [2026-11-26 20:09] `technical-validator` The brief asked for a knip run that the technical-validator definition never mentions, so the command and its scope had to be discovered.
- [2026-11-26 20:16] `visual-validator` agent-browser upload of a mode-600 file made the page's File read fail with NotReadableError, which the ERP showed only as the generic 'La page publique n'a pas pu être enregistrée'
- [2026-11-26 20:16] `visual-validator` POST /api/__test/seed does not restore the poster, prize and message the brief says the seeded concert has, so a validator that removes them must write the dev database by hand
- [2026-11-26 20:16] `visual-validator` The Page publique message and prize fields ignore agent-browser fill with an empty string, so clearing them needed focus, Control+a and Backspace
- [2026-11-26 20:31] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-26 20:36] `fix-removal` vitest --coverage.include on a single site core file printed an empty coverage table, so per-file coverage could not be read directly
- [2026-11-26 20:36] `fix-removal` concert-registrations.queries.ts and concert-registrations.service.ts both sit at the 300-line max-lines limit, so any fix there must first find lines to give back
- [2026-11-26 20:46] `technical-validator` pnpm exec knip --workspace . run from apps/pragma exits 1 listing every devDependency as unused, while the same check from the repo root with --workspace apps/pragma exits 0
- [2026-11-26 20:55] `friends-target` scripts/dev-server.sh start --as <label> gives the site its own port but not the API or socket port, so a second pragma server's API dies on EADDRINUSE 3004 and its site silently talks to the other server's API.
- [2026-11-26 21:14] `visual-validator` The brief placed the ERP under /app, but /app/login renders a blank page and sign-in lives at /login, so the first drive found no form.
- [2026-11-26 21:14] `visual-validator` A member deleted through the API stayed in the concert card after a reload, because the persisted pragma.query-cache in localStorage served the stale member list until it was cleared by hand.
- [2026-11-26 21:46] `visual-validator` CDP Emulation.setEmulatedMedia accepts display-mode standalone and returns ok but Chromium 158 ignores it, so an installed-app check needs a matchMedia stub instead
- [2026-11-27 09:50] `main` The public upcoming-concerts API (GET /api/concert-registrations/upcoming) returned a registrationCount per concert that no screen displays; the operator found it, not the session
- [2026-11-27 09:58] `main` the session said it would wait for the technical validator to finish reading the hide-count worktree before editing; the operator asked whether it was not in a worktree (where: this session, reply after the operator approved the kaizen.sh change)
