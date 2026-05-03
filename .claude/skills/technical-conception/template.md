# Plan template

Copy this into `docs/features/<app>/<feature-slug>/plan/plan.md` and fill it in. Section names match the standard at [`standard.md`](./standard.md); keep them identical so plans are diff-able.

Delete the block-quoted prompt under each heading once the section is written.

---

# Plan — <feature title>

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

## How each spec decision becomes code

> *Every Q.O.D. number and every "Changes" entry from the spec maps to a row. Out-of-scope items get a row with `Where it lands = (out of scope)` so they are not silently dropped.*

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q1 |  |  |  |

## Risk register

> *Every risk that can ship needs a detection path. If a risk has no detection, escalate to the spec author — it's a Sentry blind spot.*

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
|  | low / medium / high |  |  |

## Code-quality self-check

> *Pulled from CLAUDE.md and the repo's biome / knip / commitlint config. Sub-skills (`/vite`, `/three-js`, …) extend this. An unchecked box blocks push.*

- [ ] `pnpm exec biome lint` clean (incl. type-assertion plugin: only `as const`, `as unknown`).
- [ ] `pnpm typecheck` clean (`tsc --noEmit` in every workspace touched).
- [ ] No `any`.
- [ ] No abbreviations / one-letter locals outside trivial loop indices.
- [ ] Magic numbers and strings extracted to named constants.
- [ ] Comments document the WHY only — no what-comments, no JSDoc on internals.
- [ ] Function names describe the result, not the mechanism.
- [ ] Conventional-commit scope matches the touched app (`borso-fr`, `borsouvertures`, `infra`, `ci`, `docs`, `deps`).
- [ ] `pnpm exec knip` clean — no unused exports / files / deps.

## Pre-flight gates

> *Numbered, reproducible, verifiable. Gates that need human judgement are listed as `human:`.*

1. `pnpm install`.
2. `pnpm --filter <pkg> typecheck`.
3. `pnpm exec biome lint`.
4. `pnpm --filter <pkg> build`.
5. (UI work only) `/visual-validation docs/features/<app>/<slug>/spec/spec.md`.
6. `pnpm exec knip`.
7. (Test-bearing code only) `/technical-validation docs/features/<app>/<slug>/spec/spec.md`.

## Open questions / unknowns

> *Ambiguities planning surfaced that the spec did not resolve. Sent back to the spec author. Implementation does not silently proceed past them.*

-

## Missing technical skills

> *Domains that would have benefited from a `.claude/skills/<name>/` skill but did not have one. Seed next iteration.*

-
