_Earlier versions of this entry catalogued three patterns
(`<details>` stripped, `![alt](url)` wrapped in backticks,
pseudo-HTML in backticks stripped) as if they were stable
sanitizer behaviour. **Those claims could not be reproduced** —
PR #26 was opened from the same harness with literal
`<details>...</details>` blocks and `![Catalog](https://…)`
markdown images, and both render fine in the stored body. The
PR #23 ergonomic pain that prompted the entry was real, but its
root cause was misdiagnosed (image tags emitted without `src`,
operator-side iteration on wording, not a sanitiser rewrite).
This file now documents only what is reproducible from the
remote-execution harness today._

## Verification procedure (run before claiming any new pattern)

Anything that looks like a sanitizer-stripped-or-rewrote claim
gets confirmed against a real PR before landing in this file.
Two cheap loops:

1. **Round-trip on a draft PR.** Send a body with the suspected
   pattern via `mcp__github__create_pull_request` or
   `update_pull_request`, then immediately read the stored body
   back via `mcp__github__pull_request_read method: get`. Diff
   what you sent against what's stored. If they match
   character-for-character, the sanitizer is not the cause.

2. **Inspect a recent in-repo PR known to render the pattern.**
   List recent PRs (`mcp__github__list_pull_requests
   state: open|all`). If the pattern in question is present in
   that PR's stored body and renders on GitHub, the sanitizer
   doesn't touch it.

Concrete reference points as of 2026-05-20:

- PR #26 (`claude/pragma-erp-specification-…`) — stored body
  contains `<details>` / `<summary>` blocks and `![alt](url)`
  markdown images. Both render correctly on GitHub. Use this
  PR as the control sample when adding a new claim.

## Confirmed sanitizer behaviours

### Markdown links come back wrapped in double backticks — sometimes

Observed 2026-08-13 on PR #46, three times, through two different
tools. What was sent:

```markdown
[ADR-0010](https://github.com/hugoleborso/borso.fr/blob/<branch>/docs/adr/0010-….md)
```

What `pull_request_read method: get` returned for the stored body:

```markdown
[ADR-0010](``https://github.com/hugoleborso/borso.fr/blob/<branch>/docs/adr/0010-….md``)
```

The backticks are inside the parentheses, so the link is dead: GitHub
renders the literal text rather than an anchor. Two replies posted with
`add_reply_to_pull_request_comment` were hit the same way, one of them
also pulling the sentence's trailing comma inside the backticks.

**The trigger is not isolated.** In the same three bodies, these came
through untouched:

```markdown
[`blueprint-coverage.html`](https://…/blueprint-coverage.html)
[`scripts/check-single-stylesheet.sh`](https://…/check-single-stylesheet.sh)
[standard 00](https://…/docs/standards/00-principles.md)
```

So it is not "all links", not "all `.md` targets", and not "all
plain-text link labels" — `[standard 00](…00-principles.md)` survived
while `[ADR-0010](…0010-….md)` did not. Three samples are not enough to
name the rule, and this entry's own procedure says not to claim one
without reproducing it. What is confirmed is the *effect*, with the
stored bodies as evidence.

**Mitigation, cheap and reliable:** in agent-authored PR bodies and
review replies, write the bare URL on its own rather than a markdown
link when the link matters. GitHub autolinks it, and a bare URL has
been observed to survive every time. When a labelled link is worth it,
read the stored body back afterwards and repair it if the backticks
appeared — that is the round-trip loop above, and it takes one call.

_Untested here: whether `<details>` and `![alt](url)` are affected. The
2026-05-20 retraction above stands for those until someone re-runs the
procedure on them._

## Why this entry still exists

The remote-execution agent never sees the rendered PR — only
the markdown source. **If a sanitizer ever does rewrite
markup**, a future agent that "wrote a perfect description" can
be looking at a corrupted version on GitHub without ever
knowing. The verification procedure above is the cheap loop
that protects against that, and this file is the place to
catalogue any reproducible quirk that survives it.

## See also

- [`docs/dantotsus/orchestrator-shipped-with-stale-pr-description.md`](../dantotsus/orchestrator-shipped-with-stale-pr-description.md) — neighbour: PR-description ergonomics from a different angle (an orchestrator's stale snapshot, not a sanitizer's silent rewrite).
- [`docs/knowledge/escape-html-around-json-in-attributes.md`](./escape-html-around-json-in-attributes.md) — the same family of "HTML-attribute string-embedding" footgun, but inside a Leaflet `divIcon` rather than a PR body.
