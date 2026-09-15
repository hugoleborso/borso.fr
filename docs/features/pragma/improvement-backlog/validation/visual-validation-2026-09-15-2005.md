# Visual re-check — the shipped row moves without a reload

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Re-checks: [`./visual-validation-2026-09-15-1936.md`](./visual-validation-2026-09-15-1936.md), row 12 only
- Dev URL: https://pragma-pr-99.preview.borso.fr (API on https://pragma-pr-99-api.preview.borso.fr), rebuilt from `dc593dd`
- Run at: 2026-09-15T20:05:00Z
- Scope: the one row the earlier run failed, plus the sibling behaviour that run noted. Every other row stands as recorded there, and none was re-run.

## Why there are two reports

The earlier report records what was true when it was written, and this repository does not edit a dated record. The row below changed because the code changed, not because the earlier reading was wrong: `08-shipped-not-reordered.png` and `09-shipped-after-reload.png` in that run's evidence folder stay as the record of the defect.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 12 | Edge 6 | A member moves an improvement to `shipped`: it drops below every open improvement and stays visible | Selected the top row (*Export the setlist as a PDF*, `idea`, 2 votes), with a 1-vote `idea` and a `planned` row below it, set Status to `shipped`, clicked **Save**, and watched the list without reloading | `./visual-validation-2026-09-15-2005/17-before-status-change.png` then `./visual-validation-2026-09-15-2005/18-shipped-reordered-no-reload.png` — the row moves from position 1 to last, below both remaining `idea` rows and the `planned` row, and stays visible. Filter pills read `All 5 / idea 2 / planned 1 / building 0 / shipped 2 / declined 0`. The tie between the two `shipped` rows, both at 2 votes, breaks oldest first | PASS |
| 12b | Implementer note from the earlier run | A newly filed improvement lands at its ranked position rather than at the top of the list | Filed a new 0-vote `idea` | `./visual-validation-2026-09-15-2005/19-created-lands-ranked.png` — it lands third: after the 1-vote `idea`, after the older 0-vote `idea`, above `planned`. A following `GET /api/improvements` returned exactly the order already on screen, so the client ranking and the server ranking agree | PASS |

## Verdict: PASS

With row 12 passing, the earlier run's remaining 19 rows carry forward unchanged: 20 of 20 assertions pass, none unverifiable.
