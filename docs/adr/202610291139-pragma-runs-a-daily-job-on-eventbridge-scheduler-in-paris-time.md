# ADR-202610291139: pragma's daily job runs on EventBridge Scheduler in Paris time and invokes the API Lambda

- **Status:** proposed
- **Date:** 2026-10-29
- **Deciders:** Hugo Borsoni
- **Tags:** practice-streak, cdk

## Context

The practice flame spec (`docs/features/pragma/practice-streak/spec/spec.md`) sends one push at 20:00 Europe/Paris to every member whose day has not counted yet. The operator ratified that job on 2026-10-29. It is the first thing in pragma that runs on a clock rather than on a request.

Two forces shape it. First, 20:00 is a wall-clock time in Paris, and Paris moves between UTC+1 and UTC+2 twice a year. Second, the job reads `study`, `session`, `member` and the push tables, so it needs the stage's DSQL login role. ADR-0036 maps that role to the stage's API Lambda only.

The job needs no new secret, because the VAPID keys are read from the database as `notifyBand` does today. Previews hold no push subscription, because `push_subscription` is blocklisted from preview clones.

## Decision

**EventBridge Scheduler, `cron(0 20 * * ? *)` in `Europe/Paris`, invoking the existing API Lambda with a fixed payload, on the production stage only.** The schedule is an `aws-scheduler` `Schedule` with a `LambdaInvoke` target, both in `aws-cdk-lib` 2.272.0, which is already installed, so no new dependency comes in. The payload is `{ "job": "streak-reminder" }`. `api/src/main.ts` hands that one shape to the job and everything else to Hono. Scheduler converts the Paris time itself, and reusing the API Lambda reuses its database role, environment and error reporting.

## Consequences

- `+` The push leaves at 20:00 Paris time all year, with no code that knows about daylight saving time.
- `+` No second Lambda, no second DSQL role mapping and no second copy of the environment.
- `-` The API entry point now accepts two event shapes. A bug in the routing guard could send an HTTP event to the job, or the job's payload to Hono. A unit test on the guard holds both directions.
- `-` The job runs within the API's timeout and memory. For 5 members that is far from any limit (inferred). A band of hundreds would need its own function.
- `-` Previews never run the job, so it is proven by unit and controller tests and by the CDK assertion, never end to end before production.
- `~` The stack gains one IAM role that Scheduler assumes, allowed `lambda:InvokeFunction` on the API function only.

## Alternatives considered

### Option A — Scheduler in Europe/Paris, targeting the API Lambda (chosen)

- **Raised by:** author
- **Summary:** As in *Decision*.
- **Strengths:**
  - Wall-clock correct across DST.
  - Reuses the API's DSQL role (ADR-0036), environment and Sentry setup.
- **Costs:**
  - One more event shape on the API entry point.
- **Rationale:** It is the only option correct on time without extra code, and the cheapest on infrastructure.

### Option B — EventBridge Rule in UTC, as talos's export job does (rejected)

- **Raised by:** author
- **Summary:** `events.Rule` with `Schedule.cron` at 19:00 UTC, as `apps/talos/cdk/lib/constructs/export-job.ts` does for its weekly run.
- **Strengths:** It follows the repo's precedent.
- **Costs:** The push leaves at 20:00 in winter and 21:00 in summer. Alternatively two rules (18:00 and 19:00 UTC) plus a guard in code that checks the Paris hour.
- **Rejection rationale:** It loses on wall-clock correctness. The guard would move a time zone rule into code that Scheduler already does.

### Option C — Scheduler targeting a dedicated Lambda (rejected)

- **Raised by:** author
- **Summary:** A second `NodejsFunction` with its own entry for the job.
- **Strengths:** The API entry point keeps one event shape, and the job could get its own timeout.
- **Costs:** A second DSQL role mapping per ADR-0036, a duplicated environment and error-reporting setup, and a second bundle to deploy.
- **Rejection rationale:** It loses on infrastructure cost and on reuse. It would win if the job outgrew the API's timeout.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Wall-clock correctness | high | The spec promises 20:00 Paris time, and the operator chose that hour. |
| Infrastructure added | medium | One operator maintains every stack, and ADR-0036 ties the database role to one function. |
| API entry point stays simple | low | One guard is cheap to test, but every entry point shape is a place to route wrongly. |

|   | Option A | Option B | Option C |
|---|---|---|---|
| Wall-clock correctness | ✓ Scheduler converts the time zone | ✗ one hour off half the year, or two rules plus a guard | ✓ Scheduler converts the time zone |
| Infrastructure added | ✓ one schedule and one role | ✓ one rule | ✗ a function, a role mapping and an environment |
| API entry point stays simple | ✗ a second event shape | ✗ a second event shape | ✓ untouched |

## Implementation pointers

- Spec: `docs/features/pragma/practice-streak/spec/spec.md` (Architectural choices)
- Plan: `docs/features/pragma/practice-streak/plan/plan.md`
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/cdk/lib/stack.ts`, `apps/pragma/api/src/main.ts`, `apps/pragma/api/src/streaks/`
- Related ADRs: ADR-0036 (one DSQL login role per stage, mapped to the API Lambda), ADR-0031 (error reporting)
