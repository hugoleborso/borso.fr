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
