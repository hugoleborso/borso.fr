# A "this never happened" claim from CloudWatch is only as old as the retention

`aws logs filter-log-events` accepts any `--start-time` you give it. It does
not tell you that the log group throws events away long before that. Ask for
thirty days from a group with seven days of retention and you get seven days
of events and a silent, confident-looking empty stretch where the other
twenty-three would be.

That matters whenever the finding *is* the absence. Debugging PR #60 turned on
one observation — the pragma production API had served reads and logins and
**not one write request** — which is strong evidence for a user hunting a
button rather than pressing a broken one. Stated as "no writes in thirty days"
it would have been wrong. The true claim is "no writes in the retained window,
which on 17 Aug 2026 started at the 14th", and that is a different sentence.

## Check the retention before quoting the window

```bash
aws logs describe-log-groups \
  --log-group-name-prefix /aws/lambda/pragma-prod-api \
  --query "logGroups[].[logGroupName,retentionInDays]" --output text
# /aws/lambda/pragma-prod-api	7
```

`retentionInDays` empty means never expires. Anything else caps every query
against that group, and the oldest event you can see is the real start of your
evidence:

```bash
aws logs filter-log-events --log-group-name /aws/lambda/pragma-prod-api \
  --start-time 0 --max-items 1 --query "events[0].timestamp" --output text
```

Both numbers belong in whatever you write down. "No write request reached the
API between 14 and 17 Aug, the whole retained window" is auditable. "No writes
in a month" is not, and a reader who checks will find the group cannot answer
that question at all.

## The same shape elsewhere

Any store that ages data out turns a query window into a claim window: metric
resolution rolls up after fifteen months, X-Ray traces expire at thirty days,
and a preview stack's log groups are deleted with the stack. When the evidence
is that nothing is there, first ask how long "there" lasts.

## See also

- [`docs/dantotsus/the-page-that-listed-what-it-could-not-create.md`](../dantotsus/the-page-that-listed-what-it-could-not-create.md) — the investigation this bounded.
- CLAUDE.md, *Tone & rigor*: no invented numbers, and bind the claim to the artefact you actually read.
