# Standards review — claude/pragma-optimistic-updates-931m3b against origin/main

Verdict: PASS
Ledger: a71d330af564
Reviewed: 1 file(s). Sealed: 1. Findings: 0.

Round ten. `seal.ts verify --base origin/main` named one file of the branch's
27 reviewable files as unsealed: `apps/last-loop-lepin/api/src/punch/punch.service.ts`,
unsealed because commit `0399ffa` edited it to address round nine's finding.
The other 26 carry current seals and were not re-read.

## Findings

None.

## Sealed

- `apps/last-loop-lepin/api/src/punch/punch.service.ts` — read in full (252 lines).
  Round nine's finding is genuinely fixed, not renamed: the four request-body types
  are `z.infer` of the schemas they mirror — `RegisterPunchInput` (line 57),
  `SelfPunchInput` (108), `RecordDidNotFinishInput` (170) and `CatchupPunchInput` (191) —
  and each named schema exists in `punch.schema.ts`, so *03. Typing*'s "a request body
  from `z.infer`" bullet is satisfied by derivation rather than by a hand-written
  interface that happens to agree.

  Also checked, bullet by bullet:
  - *03. Typing*, untrusted input parsed with Zod — the service's entry points take
    already-parsed types; `punch.controller.ts:44,69` parse with `zValidator('json', …)`.
    Nothing in this file annotates a raw body into shape.
  - *04. Back end* and *11. Database*, one transaction owned by the service — both
    multi-table writes are wrapped: `catchupPunch` (226-229) inserts the punch and
    deletes the manual DNF inside one `runInOneTransaction`, and
    `clearEditionPunchHistory` (234-236) wraps the paired delete. The single-table
    writes (`insertManualDidNotFinish`, `markPunchCorrected`, `markPunchVoided`) are
    correctly unwrapped.
  - *11. Database*, a cascade DSQL will not enforce written out explicitly — the manual
    DNF delete on catchup (228) and `clearEditionPunchHistoryWithin` (239-244), which
    `edition.service.ts` calls inside the edition-delete transaction, are that cascade
    written by hand. DSQL takes no foreign key, so this is the only place it can live.
  - *01. Naming*, the behavioural half of the verb table — `findActivePunchForLoop`
    (`punch.repository.ts:70`) and `findPunchById` (`:95`) both return `Promise<LoopPunch | null>`
    and return `null` rather than throwing; `getEdition` (`edition.service.ts:96-100`)
    throws `EditionNotFoundError`; `buildPunchRejectionError` returns the error it names.
  - *01. Naming*, no negated boolean — the only boolean is `validation.ok`.
  - *01. Naming*, comments — the file carries no prose comment. The four annotations are
    `@FollowsBlueprint named-domain-error` (31, 36) and the two `@Blueprint` JSDoc blocks
    (44-49 `named-domain-error`, 72-77 `service-orchestration`), all machine-read and
    exempt. The `service-orchestration` block still describes what `registerPunch` does:
    read edition and punches, decide in `punch.core.ts`, throw a named error, write.
  - *12. Lint and gates* — no `eslint-disable` in the file, so no reason to check.
  - Magic number named: `ONE_MILLISECOND` (194) inside `lastInstantOfLoop`.

## Unclear

None.

## Outside the checklist

- `seedPunch` (246) and `seedManualDidNotFinish` (250) are test-support entry points on a
  production service; their only callers are `apps/last-loop-lepin/api/src/__test/test-seed.service.ts:78,96`.
  No reviewer bullet covers "test affordances exported from production code", and the
  repository has no standard forbidding it, so this changed no verdict. Noting it only
  because a reader of `punch.service.ts` cannot tell from the file that these two have no
  production caller.
- Nothing on this file predates the branch in a way that would need a follow-up: every
  line reviewed here is inside the five commits the branch made to it
  (`4da429e`, `e41931e`, `111fd6b`, `bd0d3c0`, `0399ffa`). The scope note about
  transitively-pulled back-end content did not apply this round.
