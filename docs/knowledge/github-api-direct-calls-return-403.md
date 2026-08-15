# A direct call to api.github.com returns 403, and a naive parser reads it as zero

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

## The part that actually costs time

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

## Getting CI status the way that works

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

## Related

- [`docs/knowledge/github-mcp-pr-body-sanitizer.md`](./github-mcp-pr-body-sanitizer.md)
  — the other place the GitHub MCP surface differs from what you typed.
