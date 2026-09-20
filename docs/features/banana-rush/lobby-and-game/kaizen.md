# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [20:41] `websocket-construct` a CDK construct that grants nothing still synthesises one AWS::IAM::Policy, because NodejsFunction with Tracing.ACTIVE adds the X-Ray policy, so a resourceCountIs('AWS::IAM::Policy', 0) negative assertion fails for a reason unrelated to the grant under test
- [20:54] `cdk-stack` a real cdk synth of a new full-stack app cannot run until the site builds, so the CDK layer's only end-to-end proof is blocked by an unrelated agent's half-written front end
- [20:56] `cdk-stack` the synth/diff/deploy scripts pass 'cdk synth --all', which this aws-cdk CLI version answers with 'Unknown option(s): --all. These will be ignored.' on every run
- [21:19] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [21:27] `main` the repo's three strictest lint rules (no runtime Tailwind class names, decisions live in pure functions, no dynamic translation keys) each fired ten-plus times on a first-pass front end, so a new app pays them as one large rework instead of as they are written
- [21:27] `main` a front end written before its first lint run needed four rounds of restructuring, because nothing surfaces the bucket rules (atoms import no component, routes are named Page) until eslint runs over the whole workspace
- [21:27] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [21:35] `main` a back-e2e test asserted secrecy with JSON.stringify(view).not.toContain('30'), which also matches the minutes inside an ISO timestamp, so the suite passed all day and failed only when the wall clock read :30
- [21:36] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [22:16] `voice-research` aws voice-id in eu-west-3 fails as a proxy 502 Bad Gateway, which reads as a network or proxy fault rather than what it is: the regional endpoint has no DNS record because the service is not in that region
- [14:29] `main` the Web Speech API cannot be constrained to numbers because grammars were removed from the specification, so every recogniser answer needs an application-side number parser
- [14:37] `main` the architecture PR comment reads *-diff.json and a brand new application never writes one, so adding a whole app makes the comment say 'No application's architecture moved on this branch' while the job summary correctly calls it new
- [14:41] `main` adding an app to the CloudFront Function's SPA list moved the committed borso-shared template snapshot, because that function ships as a string inside the shared template, and the PR body had already claimed no shared deploy was owed
- [14:41] `main` the preview auto-seed step treats having an api directory as having a fixture to seed, so a full-stack app whose rows are all created by its users failed its deploy on a 404 from a route it never mounts
- [15:14] `main` a five second round made a latent bug reachable: the client marked the round as asked-for before the resolve request, so one round-still-open refusal from clock skew would strand the round with no phone ever asking again
- [15:40] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [15:44] `main` a browser-invented request header is silently dropped by the API Gateway CORS allow-list, so every seated player's fetch never left the page and the screen rendered blank — the allow-list lives in the shared LambdaApi construct and nothing in the app can see it
- [15:44] `main` the failure branch of a route rendered an ErrorNote whose code was null for any non-ApiError rejection, so a blocked preflight produced a completely blank page instead of a message
- [15:44] `main` a service worker cannot import the repo's TypeScript, so public/sw.js duplicates the predicates in src/sw/sw-cache.utils.ts by hand — pragma has the same duplication and nothing checks the two agree
- [15:44] `main` there is no raster tooling in this image (no sharp, no cairosvg, no imagemagick), so PWA icon PNGs had to be rendered by screenshotting an HTML page through scripts/browser.sh at a set viewport
- [15:44] `main` a deep link like /partie/CODE 404s on a cold load until infra/shared is dispatched, because the SPA rewrite list ships inside the borso-shared CloudFront Function — an invitation link on the root path is the only form that cannot outrun its infrastructure
- [15:55] `main` check-pure-modules-have-callers caught a sw-cache.utils.ts reached only by its test — and its allow-list already carried two pragma entries for the same unmade 'SW bundling decision', which is a deferral the gate names but cannot force
- [15:55] `main` a tsconfig that extends another inherits its exclude, so tsconfig.sw.json silently typechecked zero files and tsc exited 0 — only ESLint's 'not found in any of the provided project(s)' revealed it
- [15:55] `main` the six lint findings on the service worker entry only appeared once it was actually in a tsconfig, which means a file outside every project passes every type-aware gate by being invisible to them
