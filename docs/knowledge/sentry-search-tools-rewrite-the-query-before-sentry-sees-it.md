---
summary: 'Both Sentry search tools run an agent over `query` before Sentry sees it; a bare tag value is sometimes rewritten into a project filter and returns `400 Project(s) X do not exist`, so quote every tag value.'
triggers:
  output:
    - 'do not exist or are not actively selected'
  paths:
    - '.claude/skills/quality-dashboard/SKILL.md'
---

# The Sentry search tools rewrite the query before Sentry sees it

`search_issues` and `search_errors` are not pass-throughs. Their own tool
descriptions say so:

> `query` is natural language or Sentry issue search syntax. Seer translates
> natural language when the organization has AI issue search; otherwise a
> configured embedded agent fixes query and sort while preserving explicit
> Sentry search syntax.

and, for `search_errors`:

> a configured agent translates it into query, fields, and sort.

"Preserving explicit Sentry search syntax" is the intent, not a guarantee. The
agent is a model, so the same string can come back rewritten on one call and
untouched on the next.

## What it looks like when it goes wrong

```
API error (400): Invalid query. Project(s) banana-rush do not exist or are not actively selected.
```

The organization `borsofr` has exactly one project, also called `borsofr`, and
applications are told apart by the custom `app` tag. The agent does not know
that tag, so it sometimes reads `app:banana-rush` as a request for a project
named `banana-rush` and injects a project filter. Sentry then refuses the
whole query.

## It is not the hyphen, and it is not the value

A session on 2026-11-11 wrote the lesson down as "a hyphenated tag value must
be quoted". That is wrong, and believing it is worse than not having it,
because it says the five other calls are safe. Measured over 11 calls in one
later session, against the same organization, same tag, same minute:

| Value | Unquoted | Quoted |
| --- | --- | --- |
| `borso-fr` | ok | ok |
| `last-loop-lepin` | ok | ok |
| `banana-rush` | **400**, twice | ok, twice |
| `pragma`, `talos`, `borsouvertures` | ok | not tried |

The session that first hit it saw the exact opposite pair fail:
`last-loop-lepin` and `borso-fr` returned 400 while `banana-rush` succeeded.
All three are hyphenated. So the hyphen does not predict the failure, and
neither does the value: the same value both worked and failed depending only
on which call it was.

Quoting held 6 times out of 6 across both sessions. It works because an
explicitly quoted string literal leaves the agent nothing to reinterpret.

## What to do

- Quote every tag value: `app:"banana-rush"`, not `app:banana-rush`.
- Pass `includeExplanation: true` while debugging. The reply carries
  `executedSearch.query`, which is what Sentry actually ran. When it differs
  from what you sent, the agent rewrote it.
- Treat a 400 as a missing measurement, never as a zero. The call that fails
  returns no rows, and a row count of nothing looks exactly like "nothing is
  broken". That is how a wrong number nearly reached the 3S board; see
  [`../dantotsus/the-zero-that-meant-the-call-never-happened.md`](../dantotsus/the-zero-that-meant-the-call-never-happened.md).

## See also

- [`reading-third-party-sources-from-a-session.md`](./reading-third-party-sources-from-a-session.md)
