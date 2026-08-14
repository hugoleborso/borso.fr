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

**The trigger is the URL's length.** Other links in the very same
bodies came through untouched, so it is not "all links" nor "all `.md`
targets". Sorting six samples from two PRs by URL length separates them
perfectly:

| Length | Verdict | Tail of the URL |
|--------|---------|-----------------|
| 156 | mangled | `…/dantotsus/a-lint-rule-that-knew-only-one-of-three-spellings.md` |
| 156 | mangled | `…/dantotsus/a-feature-that-was-never-switched-on-in-any-stage.md` |
| 151 | mangled | `…/adr/0010-pragma-domain-folder-for-cross-boundary-rules.md` |
| 149 | survived | `…/dantotsus/three-green-gates-on-code-that-ran-nowhere.md` |
| 135 | survived | `…/knowledge/github-mcp-pr-body-sanitizer.md` |
| 120 | survived | `…/standards/00-principles.md` |

Everything at or above 151 characters was wrapped; everything at or
below 149 survived. Six samples put the threshold somewhere around 150
and do not pin it exactly, so treat ~150 as the working number rather
than the specification.

**Mitigation, in order of preference:**

1. **Shorten the URL below the threshold.** On a long-lived agent
   branch this is nearly free: `claude/blueprints-creation-followers-am3mxz`
   is 42 characters against `main`'s 4, so linking a merged file through
   `/blob/main/…` rather than `/blob/<branch>/…` takes 38 characters off
   every link in the body and puts all six samples above safely under.
2. **Write the bare URL** with no markdown link. GitHub autolinks it and
   a bare URL has survived every observation, at any length.
3. **Read the stored body back** after posting anything long and
   labelled, and repair it — the round-trip loop above, one call.

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
