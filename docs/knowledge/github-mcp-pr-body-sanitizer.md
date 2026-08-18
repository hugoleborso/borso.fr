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

### An angle-bracket placeholder is deleted, backticks or not

Observed 2026-08-15 on PR #51, twice in one body, both inside code spans:

| Sent | Stored |
| --- | --- |
| `` `npx vitest run <file>` `` | `` `npx vitest run ` `` |
| `` `Last verified: <date>` `` | `` `Last verified: ` `` |

The placeholder is read as an HTML tag and dropped, and the backticks that
should protect it do not. Other angle brackets in the same body survived when
they were part of prose rather than a `<word>` shape, which fits tag-stripping
rather than escaping.

Confirmed again the same day on PR #49, through `update_pull_request` rather
than `create_pull_request`, so the deletion is not specific to one tool:

| Sent | Stored |
| --- | --- |
| ``both name the file `<vendor>.adapter.ts`.`` | ``both name the file `.adapter.ts`.`` |

That one is worse than an empty field: the sentence still parses, and it now
says every reporting adapter is named `.adapter.ts` with nothing in front. A
deleted placeholder does not always leave a visible hole — check the sentences
it was inside, not only the token.

This makes a placeholder in a PR body actively misleading — `Last verified: `
reads as an empty field rather than as a form to fill in. Write the shape out
instead: `Last verified: YYYY-MM-DD`, `npx vitest run path/to/file.test.ts`.

Cheap to check: read the body back after creating the PR and grep for the
placeholders you sent.

### `<details>` and `<summary>` are stripped; the markup inside them survives

Observed 2026-08-15 on PR #49, through `mcp__github__update_pull_request`,
following the round-trip procedure above. What was sent:

```markdown
<details>
<summary><b>Four blind spots, each a different kind</b></summary>

- **A flow is not a composition.** …
</details>
```

What `pull_request_read method: get` returned for the stored body:

```markdown

<b>Four blind spots, each a different kind</b>

- **A flow is not a composition.** …
```

Both `<details>` and `<summary>` are gone; the `<b>` inside the summary
survived, as did every list item. Four such blocks in one body were hit
identically. This is tag-stripping of the two collapsible tags rather than a
general HTML strip, which is why `<b>` came through.

**This contradicts the 2026-05-20 retraction above**, which recorded PR #26 as
a control sample where `<details>` round-tripped intact. Both observations
cannot describe the same behaviour; what changed between May and August is not
known from here. Treat the newer one as current and re-run the procedure before
relying on a collapsible section.

**Consequence for `/open-pr`.** That skill's three-level progressive disclosure
is built on `<details>`, so a body written to its template arrives flattened:
every level-2 and level-3 section renders expanded, in order, with its summary
line as a stray bold sentence. The body is not corrupted, only longer than
intended — but a reviewer who was promised a skimmable summary gets the whole
thing. Until this is re-verified, write the PR body with headings for the
sections a reviewer may want to skip, and keep the first screen self-contained.

_Caveat on the evidence: `pull_request_read method: get` truncates a long body
at roughly four thousand characters, so this was read from the verbatim prefix
rather than the whole document. The stripped tags sit inside that prefix._

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

_`<details>` has since been re-tested; see the section above. `![alt](url)`
was untested until 2026-08-18, when the probe below answered it._

## What the sanitizer does to each form (probed 2026-08-18, PR #60)

One `update_pull_request` call per form, each followed by a
`pull_request_read` of the stored body. The body was being written to carry
before-and-after screenshots of a phone screen, and every attempt to show them
came back defused:

| Written | Stored | Renders as |
| --- | --- | --- |
| `<img src="…" width="300">` | `<img width="300">` | nothing — an empty tag |
| `![alt](…/shot.png)` | `![alt](` + backtick-wrapped URL | code, not an image |
| `[text](…/shot.png)` | same backtick wrap | code, not a link |
| `[text](…/tree/<sha>/dir)` | unchanged | a working link |
| `[text](…/blob/<sha>/CLAUDE.md)` | unchanged | a working link |
| `[text](…/commit/<40-hex-sha>)` | unchanged | a working link |
| `<https://host/path>` | removed entirely | nothing |
| `<details>` / `<summary>` | removed, contents kept | a flattened section |

The rule is the **extension**, not the URL, the host or the pinned SHA: a
40-hex commit SHA passes untouched inside a `.md` link and is wrapped inside a
`.png` one. Short SHAs, branch names and `main` all behave the same, so
shortening or re-pinning the URL does not help.

**What to do instead.** Commit the screenshots and link the pull request's
Files changed tab, which renders committed images inline; use `###` headings
where the standard asks for `<details>`; then read the body back. Since
2026-08-18 a PreToolUse hook refuses a body carrying any of the defused forms
before the call is made — `.claude/hooks/pretool-github-pr-body.sh`, wired for
`mcp__github__create_pull_request` and `mcp__github__update_pull_request`.

A body posted through the claude.ai web UI or by `gh` is not affected; the
open-pr standard's `<details>` requirement is written for that path. The
rendered evidence for this repository is
[`docs/dantotsus/a-pull-request-body-the-server-quietly-emptied.md`](../dantotsus/a-pull-request-body-the-server-quietly-emptied.md).

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
