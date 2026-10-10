---
summary: 'A direct `api.github.com` call answers 403 and there is no `gh` auth; use the GitHub MCP tools, and never read a missing count as zero.'
triggers:
  commands:
    - 'api\.github\.com'
  output:
    - 'GitHub access is not enabled for this session'
---

# GitHub is reachable only through the MCP server, and that shapes what you can edit

In a Claude Code on the web session, a direct call to the GitHub API does not
work:

```bash
curl -s https://api.github.com/repos/hugoleborso/borso.fr/pulls/50
# 403
# {"message":"GitHub access is not enabled for this session.
#   An org admin must connect the Claude GitHub App for this organization."}
```

Last verified: 2026-08-15 — the call above, from a session on this repository.

There is no `gh` CLI either. Everything goes through the `mcp__github__*` tools.
That is fine for reading and for posting, and it has one consequence worth
planning around.

## The MCP escapes the text it returns

`pull_request_read` gives a pull request's body back with HTML entities in it —
`&#34;` for a quote, `&#39;` for an apostrophe. Those are an artefact of the
transport, not the stored body. So a round trip of *read the body, splice a
section in, write it back* has to unescape them correctly or it silently mangles
the description. `update_pull_request` replaces the body wholesale; there is no
append.

The practical consequence: **adding to a long pull request description is
riskier than adding a comment.** A 9 KB body re-sent with one bad substitution
is a corrupted description and no easy diff to spot it. A comment is additive
and cannot damage what is already there.

When the body genuinely has to change — a wrong statement in it, rather than
missing material — read it, unescape `&#34;`, `&#39;` and `&amp;`, splice, and
compare lengths before and after as a cheap sanity check.

## Related

- [`github-mcp-pr-body-sanitizer.md`](./github-mcp-pr-body-sanitizer.md) — what
  the server strips from a body on the way in.

## A direct call to api.github.com returns 403, and a naive parser reads it as zero

_Merged from `github-is-reachable-only-through-the-mcp-server.md` on 2026-10-10, when every entry gained a trigger._

In a Claude Code session the outbound proxy intercepts direct calls to
`api.github.com` and answers **403** with this body:

```json
{
  "message": "GitHub access is not enabled for this session. An org admin must connect the Claude GitHub App for this organization.",
  "documentation_url": "https://docs.anthropic.com/en/docs/claude-code/github-actions"
}
```

Use the `mcp__github__*` tools instead. They carry the session's credentials
and they work.

### The part that actually costs time

The 403 is easy. The trap is what a polling loop does with it.

Waiting for CI on PR #52, a loop fetched `/commits/<sha>/check-runs` with plain
`curl` and read the count with `j.total_count ?? 0`. The 403 body has no
`total_count`, so every iteration printed *no checks yet* — eighteen times, for
seven and a half minutes, while five jobs were running and finishing. The
conclusion drawn from that output was that the workflows had not triggered at
all, and the next move was to go read `ci.yml` looking for a `paths` filter
that did not exist.

`?? 0` on a field of an unvalidated response turns *the request failed* into
*the answer is zero*, and zero is a plausible answer to "how many checks are
there?". Nothing in the loop distinguished the two.

So: check the status code before the body, and when a count is missing from a
response, say it is missing rather than defaulting it. The repository already
prefers `const parsed: unknown = JSON.parse(raw)` followed by a Zod parse for
exactly this reason — see
[`docs/standards/03-typing.md`](../standards/03-typing.md).

### Getting CI status the way that works

```
mcp__github__pull_request_read  method: get_check_runs   # per-job status and conclusion
mcp__github__pull_request_read  method: get_status       # combined state
mcp__github__actions_list       method: list_workflow_runs
```

`get_check_runs` returned `total_count: 7` on the same commit and the same
minute the curl loop was reporting zero.

One sharp edge on the third: `actions_list` can return a very large payload
(370 KB for three runs on this repository), which overflows the context. It is
saved to a file and the tool tells you the path; slice it with `python3 -c` or
hand it to a sub-agent rather than reading it whole.

### Related

- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](./github-mcp-pr-body-sanitizer.md)
  — the other place the GitHub MCP surface differs from what you typed.
