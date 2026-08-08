# `AskUserQuestion` rejects calls that omit the `question` field per item

## Symptom

```
InputValidationError: AskUserQuestion failed due to the following issues:
The required parameter `questions[0].question` is missing
The required parameter `questions[1].question` is missing
…
```

…even though the call carries `header`, `options`, and `multiSelect` for each item. The failure is silent in the sense that the agent can keep emitting the same shape and the tool keeps rejecting; only on careful re-read of the schema does the missing field stand out.

## Why

The `AskUserQuestion` tool's JSON schema requires *both* `header` (the chip-style label, max 12 characters) *and* `question` (the full sentence ending in a question mark) on every entry of the `questions` array. They look like alternatives at first glance — both are textual fields naming what is being asked — but they serve different UI affordances:

- `header` is the small label rendered next to the answer in the post-answer summary, so the user can grep their answer log later. Constrained to ~12 characters.
- `question` is the full sentence rendered in the modal at ask-time. No length cap.

If the agent fills in `header` but not `question`, the tool can't render the modal — there's no full sentence to show — and rejects the call. If the agent fills in `question` but not `header`, the tool accepts (the modal renders) but the post-answer summary is harder to scan.

## Pattern

Every entry in the array needs:

```json
{
  "header": "Short label",
  "question": "Full sentence ending in a question mark?",
  "options": [{"label": "...", "description": "..."}, ...],
  "multiSelect": false
}
```

A single missing `question` on any entry rejects the *entire* call (not just the offending entry).

## Common-confusion variant

The schema also requires the `question` field on the *outer* level when only one question is asked, *and* on each entry when multiple are asked. The naming is cleaner than it looks once you internalise it as "header is short, question is long".

## Operator note

When the tool returns `InputValidationError` listing missing `questions[<n>].question`, the fix is mechanical: copy the rendered `header` text into the `question` field, expand it to a full sentence, and resend.

## See also

- The `AskUserQuestion` tool's JSON schema appears in the deferred-tool list when it's first surfaced; the schema is the source of truth.
- [`.claude/skills/specification/SKILL.md`](../../.claude/skills/specification/SKILL.md) — heaviest user of `AskUserQuestion` in the repo, where this gotcha is most likely to bite.
