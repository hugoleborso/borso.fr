---
summary: 'arXiv `/abs/` parses and `/pdf/` does not, a third-party GitHub repository is reachable only through the rendered page or `add_repo`, and the container has no man pages: use `git <sub> -h`, `help <builtin>` or man7.org.'
triggers:
  commands:
    - 'arxiv\.org/pdf'
    - 'raw\.githubusercontent\.com'
    - '(^|[;&|\s])(man|git\s+help)\s+[a-z0-9]'
  output:
    - 'This system has been minimized'
---

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
| `api.github.com/repos/…` | 403 — unauthenticated calls are refused, see [`github-is-reachable-only-through-the-mcp-server.md`](./github-is-reachable-only-through-the-mcp-server.md) |
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

## Man pages: the container has none

_Added 2026-11-14, from the sweep of PR #334._ The image is a minimized Ubuntu.
`man kill` and `git help mv` both print *"This system has been minimized by
removing packages and content"*, and `/usr/share/man/man2` does not exist
(measured). A subagent writing a dantotsu on PR #327's sweep needed to quote
kill(2) and `git mv`, and had to find the pages elsewhere.

| Need | What works here (measured) |
| --- | --- |
| A git subcommand's options | `git mv -h` prints the usage. A subagent may run it: the staging hook lets `-h` and `--help` through |
| A shell builtin | `help kill` |
| A system call or a full man page | `WebFetch` on `https://man7.org/linux/man-pages/man2/kill.2.html` |
| The full git manual | `WebFetch` on `https://git-scm.com/docs/git-mv` |

