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
