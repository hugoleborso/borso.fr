# Reading a paper or a third-party repository from inside a session

Two things a research pass reaches for, and how each actually works here.

## arXiv: fetch `/abs/`, never `/pdf/`

`WebFetch` on `https://arxiv.org/pdf/2401.12345` returns the PDF bytes, which
the summariser cannot parse; it answers that it cannot read the document. The
failure reads as "the tool cannot fetch papers".

`https://arxiv.org/abs/2401.12345` is HTML and works. It carries the title,
authors, the full abstract and the submission history — enough to decide whether
the paper is worth citing. Nothing in the failure message points at the `/abs/`
form.

## GitHub: only the MCP server, and only this owner's repositories

A public third-party repository is not readable the obvious ways:

| Attempt | Result |
| --- | --- |
| `raw.githubusercontent.com/<owner>/<repo>/main/…` | 404 whenever the default branch is not `main`, and there is no way to ask |
| `api.github.com/repos/…` | 403 — unauthenticated calls are refused, see [`github-api-direct-calls-return-403.md`](./github-api-direct-calls-return-403.md) |
| `gh` CLI | not installed in this image |
| `mcp__github__*` | refuses any repository outside `hugoleborso/*` |

What is left is `WebFetch` against the rendered `github.com` page, which works
for a file view or a README and gives you HTML to read through.

For a repository you genuinely need at file granularity, `add_repo` brings it
into the session if the account has access to it. That is the right move for
anything more than a couple of files; scraping rendered HTML for a whole
directory tree is not worth the tokens.

See also
[`github-is-reachable-only-through-the-mcp-server.md`](./github-is-reachable-only-through-the-mcp-server.md).
