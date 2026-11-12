# Visual-validation templates

Two templates live here. The skill uses both.

1. **Dispatch-brief template** — the self-contained prompt the skill passes to the `visual-validator` agent via the `Agent` tool. Substitute placeholders.
2. **Report template** — the markdown layout the agent writes to `docs/features/<app>/<slug>/validation/visual-validation-<timestamp>.md`.

The dedicated agent definition (with its own frontmatter, tools, and instructions) is at [`../../agents/visual-validator.md`](../../agents/visual-validator.md). The brief below is the *task* the agent receives — the agent's behaviour rules live in its definition, not here.

---

## 1. Dispatch-brief template

Pass via `Agent({ subagent_type: "visual-validator", description: "Visual validation against spec", prompt: <below> })`. Substitute `{{…}}` placeholders.

```
You are validating a feature spec against a running implementation.

INPUTS:
- spec_path:    {{spec_path}}        # e.g. docs/features/borso-fr/mondrian-atelier/spec/spec.md
- dev_url:      {{dev_url}}          # e.g. http://localhost:5173/art/mondrian/
- app_pkg:      {{app_pkg}}          # e.g. @borso-app/borso-fr
- report_path:  {{report_path}}      # absolute path you must write to
- evidence_dir: {{evidence_dir}}     # absolute path; save all screenshots here

Read the spec, build the assertion list per your standard, drive agent-browser, capture evidence inside evidence_dir as absolute paths, and write the report at report_path. Return only the report path.

Do not ask the user questions. Do not summarise the implementation. Do not skip edge cases.

PIXEL-CONTENT CHECK (mandatory per screenshot — see standard.md):
For every screenshot you take, run this `agent-browser eval` immediately
afterwards on the same page:

  Array.from(document.querySelectorAll('img'))
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => ({ src: img.src, alt: img.alt, parent: img.parentElement?.tagName }));

A non-empty result means one or more `<img>` tags rendered their `alt`
text instead of the image (CDN 403, hotlink block, missing asset). The
row that captured the screenshot is then FAIL — name the broken `src`(s)
in the report's Notes section. DOM-presence assertions are not
sufficient; users see broken alt-text where icons / sprites / glyphs
should be.
```

The brief is intentionally short. The agent's standard, tooling rules, report format, and verdict semantics live in its definition file (`.claude/agents/visual-validator.md`). The brief only carries the *task-specific* paths.

---

## 2. Report template

The agent writes this at `docs/features/<app>/<slug>/validation/visual-validation-<YYYY-MM-DD-HHmm>.md`:

```markdown
# Visual validation — <feature title>

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: <e.g. http://localhost:5173/art/mondrian/>
- Run at: <ISO 8601 timestamp>
- Tooling: agent-browser <version>

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | "<verbatim claim>" | <one-line action> | `./visual-validation-<timestamp>/01-default.png` or `URL = http://…?seed=DEADBEEF` | PASS / FAIL / UNVERIFIABLE |

## Notes

> *One bullet per FAIL or UNVERIFIABLE row, with what was observed and what was missing. PASS rows do not need a note.*

-

## Verdict: <PASS / PASS_EXCEPT_UNVERIFIABLE / FAIL>
```

### Path conventions

- The report links to its sibling spec via `../spec/spec.md`.
- Screenshots referenced from the report use paths *relative to the report file*: `./visual-validation-<timestamp>/<row-id>-<short-slug>.png`.
- The agent never writes outside `evidence_dir` or `report_path`. Files there are committed alongside the report.
