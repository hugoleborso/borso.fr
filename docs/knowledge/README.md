# Knowledge

Documentation the team needs to work effectively — anything from
vendor quirks and CLI contracts to architecture rationales,
onboarding guides, debugging recipes, naming conventions, or
historical context for a non-obvious choice. Whatever helps a future
reader (or session) understand the system without re-deriving it
from first principles.

Knowledge is the floor of the eradication ladder defined in
[`../dantotsus/README.md`](../dantotsus/README.md#eradication-ladder).
A Dantotsu can fall back to "add a knowledge entry" when no higher
level is feasible — but knowledge entries can also stand alone, no
defect required.

## When does an entry belong here vs in `docs/dantotsus/`?

| Belongs in `dantotsus/` | Belongs in `knowledge/` |
| --- | --- |
| There was a defect (or near-miss) and we shipped an eradication | There's no defect — just something a reader would benefit from knowing |
| The "fix" is a code commit + diff | The "output" is the doc itself; no code lever exists or is needed |
| Future occurrences can be prevented at lint, type, or test time | The behaviour is just a fact (vendor, convention, design choice); we adapt |

Two failure modes to watch for:

- **Dantotsu-as-knowledge:** writing "captured as follow-up; not implemented" in a knowledge entry. That's a Dantotsu without an eradication. Move to `dantotsus/` and ship the fix.
- **Knowledge-as-handover-doc:** if a knowledge entry grows beyond ~100 lines or starts walking through a multi-step recipe, it's probably outgrown this folder. Promote it to its own file under `docs/` (e.g. `docs/local-dev.md`, `docs/aws-setup.md`).

## Index

### CloudFront

- [`cloudfront-function-throttle-persistence.md`](./cloudfront-function-throttle-persistence.md) — throttle state outlives a function code update; recovery 5–15 min.
- [`cloudfront-resources-in-us-east-1.md`](./cloudfront-resources-in-us-east-1.md) — control plane is region-pinned regardless of the distribution's data-plane region.
- [`cloudfront-get-function-binary-output.md`](./cloudfront-get-function-binary-output.md) — `aws cloudfront get-function` writes the source to a positional outfile, not stdout.
- [`cloudfront-cname-uniqueness.md`](./cloudfront-cname-uniqueness.md) — aliases (CNAMEs) are single-distribution; release from the old distribution before redeploying the new one.

### GitHub Actions

- [`workflow-dispatch-default-branch.md`](./workflow-dispatch-default-branch.md) — `workflow_dispatch` and `issue_comment` workflows only show in the UI once on the default branch.

### Operator / shell

- [`macos-bsd-vs-aws-cli-quirks.md`](./macos-bsd-vs-aws-cli-quirks.md) — BSD `date`, AWS CLI v2 list-parsing, `fileb://` for binary inputs.
- [`commitlint-header-100-char-cap.md`](./commitlint-header-100-char-cap.md) — `header-max-length` is hard-capped at 100 chars regardless of scope-enum richness.

### Claude Code tooling

- [`askuserquestion-tool-requires-question-field.md`](./askuserquestion-tool-requires-question-field.md) — `AskUserQuestion` rejects calls that omit the `question` field per item; `header` alone is not enough.

### Build / lint tooling

- [`biome-stack-overflow-on-dist-binaries.md`](./biome-stack-overflow-on-dist-binaries.md) — Biome 2.x stack-overflows on woff/png binaries in `dist/`; turn on `vcs.useIgnoreFile`.

### Validation tooling

- [`agent-browser-coarse-pointer-emulation.md`](./agent-browser-coarse-pointer-emulation.md) — `agent-browser set device` does not propagate `matchMedia('(pointer: coarse)')`; touch-affordance assertions land UNVERIFIABLE without a workaround.
- [`agent-browser-cdp-click-no-op-on-react-onclick.md`](./agent-browser-cdp-click-no-op-on-react-onclick.md) — CDP `click @ref` doesn't reliably fire React `onClick`; fall back to `element.click()` via `agent-browser eval`.

## Adding a new entry

Knowledge entries don't need YAML frontmatter or a fixed structure —
write whatever helps the next reader. Keep it concrete and short
(short enough to re-read every time you suspect it applies). Title
should hint at the lesson, not the symptom.

If the entry is the result of a `/after-task-dantotsus` sweep that
classified a subject as "vendor surprise" or "operator confusion",
the skill writes it here automatically.
