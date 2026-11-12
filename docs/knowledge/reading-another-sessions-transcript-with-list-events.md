---
summary: 'list_events costs context, not money: a page under about 50k characters lands inline, a `user` event carries every tool result so `kinds` does not keep a page small, and a hook-heavy session is thousands of pages. Measure a session with `get_session` first, and parse a spilled page for typed text.'
triggers:
  output:
    - 'has_more.{0,3}:(true|false),.{0,3}first_id'
    - 'list_events-[0-9]+\.txt'
---

# Reading another session's transcript with `list_events`

Six friction lines from four agents on PR #224 (`transcript-timing`,
`transcript-fetch`, `fetch-mcp-kaizens`, `pragma-ux-recent`) hit the same tool.
These are their observations, not re-measured since.

## Start from `get_session`, not the transcript

`get_session` on a finished session returns `external_metadata.usage`, with
`cost_usd`, `cache_read_tokens`, `cache_write_tokens`, `input_tokens` and
`output_tokens`, plus `context_usage.used_tokens`. Measured on
`session_01K69KnFMwexFAkg7bqDpDTu`, 2026-10-29. That answers what a session
cost in one call. Reach for `list_events` only for a per-call question.

Read it once the session is archived. On a running session that was resumed,
`usage` looked like the latest resume only: on `session_01K69KnC3z5ZgBCLywzoUmpj`
in worker epoch 4, `cache_write_tokens` and `context_usage.used_tokens` were
both 281,772, with $8.85 of cost for a session that had already done a full
sweep (inferred, 2026-10-29).

## What a page costs

- A page reads at most 100 events, whatever the `kinds` filter. The filter runs
  after the page is read, so a filtered page can hold fewer events or none,
  with `has_more` still true.
- A page under about 50k characters comes back inline, into the calling
  agent's context. A larger one spills to a file. A `kinds` filter does not
  keep a page small. A tool result is a `user` event, so on the sweep of
  PR #310 `kinds: [user]` spilled 74,812 characters and `[user, assistant]`
  239,330, for 100 events each (measured, `session_01K69KnDzbVY3yxgGHEWuPgJ`).
- A hook-heavy session writes about 100 events per 40 to 90 s. A multi-day
  session is thousands of pages, too many for one agent run. Only a 1.5 h
  session was fetched whole.
- `pragma-ux-recent` saw `kinds: [assistant, user]` return empty data on every
  page of `session_01Leu3Yhimw9wioFyRfsVdKa`, although unfiltered pages of the
  same session held assistant and user events. Do not conclude "no messages"
  from a filtered read. Check one unfiltered page.
- Transcripts carry no system reminder and no `CLAUDE.md` text, so the
  harness's share of a call's context cannot be read from them.

## Finding what the operator typed

Parse the spilled file, do not read it. It holds a wrapper line, then JSON
from `{"ccr"`. The operator's own messages are `user` events whose
`message.content` is a string. A closed question is an `assistant` event's
`tool_use` named `AskUserQuestion`, and its answer is the next `tool_result`.
The sweep of PR #310 found both in three pages this way, where the pull
request held no review thread.

## Two agents, one prompt

Two fetch agents given identical prompts both matched a saver script keyed on
"the transcript holding my prompt", and one saved the other's file. Give each
agent a distinct label in its prompt and key on that.

## Related

- [`../quality/feature-cost.md`](../quality/feature-cost.md) holds the targets
  these measurements feed.
