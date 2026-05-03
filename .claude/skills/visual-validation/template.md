# Visual-validation templates

Two templates live here. The skill uses both.

1. **Agent prompt template** — the self-contained brief the skill passes to the dispatched validation agent. Copy the block below into the `Agent` tool's `prompt` field, substituting the placeholders.
2. **Report template** — the markdown layout the agent writes to `docs/features/<slug>/spec/visual-validation-<timestamp>.md`.

---

## 1. Agent prompt template

```
You are a visual-validation agent. You have no context from any prior conversation. Your job is to verify, in a real browser, that the running implementation matches the assertions made in a feature spec.

INPUTS:
- Spec file: {{spec_path}}
- Running dev URL: {{dev_url}}
- Workspace: {{app_pkg}}  (run Playwright via `pnpm --filter {{app_pkg}} exec ...` if you need to)
- Report path you must write: {{report_path}}

WHAT TO VALIDATE:
1. Read the spec file in full.
2. Build an assertion list. One row per item under:
   - Result (visible artefacts).
   - Use cases / edge cases — happy path (each numbered step).
   - Use cases / edge cases — edge cases (each bullet).
   - Use cases / edge cases — error cases (each bullet).
   - Q.O.D. rows whose decision is user-visible.
   Skip Q.O.D. rows that are purely engineering (build-tool, file layout, dependency, etc.). Skip the Production strategy section.
3. For each row, plan a browser action that would prove or disprove it. Use Playwright (chromium). Wait for `networkidle`, plus a 600 ms settle for rAF-driven animations. Use deterministic seeds where the spec supports them (e.g. `?seed=DEADBEEF&palette=classic`).
4. Execute the action. Capture evidence: a screenshot saved under `{{evidence_dir}}/<row-id>.png`, or a deterministic check (selector found, attribute equal, URL matches).
5. Tag the row PASS / FAIL / UNVERIFIABLE with a one-line evidence reference.

EDGE CASES THE SPEC LIKELY MENTIONS — confirm explicitly if relevant:
- Narrow viewport thresholds (e.g. ≤ 960 px, ≤ 520 px, ≤ 380 px). Resize the window and re-check the layout claims.
- `prefers-reduced-motion: reduce` — `page.emulateMedia({ reducedMotion: 'reduce' })`. Re-check default mode + entry animation.
- `prefers-color-scheme: dark` — `page.emulateMedia({ colorScheme: 'dark' })`. Re-check first-visit palette claim.
- Touch / coarse-pointer affordances — emulate via `page.emulateMedia({ media: 'screen' })` and tap-action; or describe the limitation as UNVERIFIABLE.
- URL state — navigate to `?seed=…&palette=…`, screenshot, hit Back, re-check.

OUTPUT — write to {{report_path}}, exactly the format below:

```md
# Visual validation — <feature title from spec>

- Spec: [`spec.md`](./spec.md)
- Dev URL: {{dev_url}}
- Run at: <ISO timestamp>
- Tooling: Playwright (chromium)

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 1 | Result | "<verbatim claim from spec>" | <one-line browser action> | `evidence/01.png` or `selector=".rail" found` | PASS / FAIL / UNVERIFIABLE |

## Notes

- One bullet per FAIL or UNVERIFIABLE row, expanding what was observed and what was missing.

## Verdict: <PASS / PARTIAL / FAIL>
```

RULES:
- Do not ask the user questions. If a row is ambiguous, mark it UNVERIFIABLE with a note.
- Do not summarise the implementation. Validate from the spec text only.
- Do not skip edge cases because they need extra setup. Resize. Emulate. Try.
- Every PASS must reference an evidence file or a deterministic check. "Looks right" is not evidence.
- If at least one row is FAIL, the verdict is FAIL. If none are FAIL but at least one is UNVERIFIABLE, the verdict is PARTIAL. Otherwise PASS.

DO THIS NOW. Return only the path to the report you wrote.
```

---

## 2. Report template

The agent fills this in at `docs/features/<slug>/spec/visual-validation-<YYYY-MM-DD-HHmm>.md`.

```markdown
# Visual validation — <feature title>

- Spec: [`spec.md`](./spec.md)
- Dev URL: <e.g. http://localhost:5173/art/mondrian/>
- Run at: <ISO timestamp>
- Tooling: <Playwright (chromium) / agent-browser>

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
|   |      |           |        |          |         |

## Notes

> *One bullet per FAIL or UNVERIFIABLE row, with what was observed and what was missing. PASS rows do not need a note.*

-

## Verdict: <PASS / PARTIAL / FAIL>
```
