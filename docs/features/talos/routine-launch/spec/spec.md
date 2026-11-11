# Launch the routine from the PWA and open its conversation

The owner decided on 2026-11-11 that Talos acts as soon as he speaks to it. A message typed in the PWA, and a decision on a proposal, each start the routine at once. He then wants to open the Claude Code conversation that run created, right away and later.

Today the Message screen only opens Claude Code with the text prefilled, and nothing is sent until the owner sends it there. A decision already fires the routine, but the conversation it creates is lost: the API discards the answer.

`POST <fire-url>` answers `{ "type": "routine_fire", "claude_code_session_id": "session_…", "claude_code_session_url": "https://claude.ai/code/session_…" }` (read in the Claude Code documentation on 2026-11-11). The endpoint is a research preview.

## Data shape

A **routine run** is one successful fire.

```ts
interface RoutineRun {
  id: string;            // uuid
  firedAt: string;       // ISO instant
  trigger: 'proposition' | 'message';
  subject: string;       // the proposal's memory slug, or the message cut to 200 characters
  sessionUrl: string | null; // null when the answer carried no usable address
}
```

Table `routine_run`: `id uuid primary key`, `fired_at timestamptz not null`, `trigger text not null`, `subject text not null`, `session_url text`.

Fire text: `<secret-phrase>\n<trigger>: <subject or message>`. For a message it is `message: <the whole text>`.

## R1. A message starts the routine

- R1.1 `POST /api/routine/runs` with `{ text }` (1 to 4000 characters after trimming, session required) fires the routine with `message: <text>`. A text holding a NUL character (U+0000) is refused with 400 and fires nothing, because Postgres cannot store it.
- R1.2 On success it stores a routine run and answers 201 with it.
- R1.3 Without `fire-url` it answers 503 with the existing `not-configured` error and stores nothing.
- R1.4 When the fire fails (network, or a status outside 2xx) it answers 502 and stores nothing.
- R1.5 On the Message screen the main « Talos » button sends the text this way. On success the field empties, a toast confirms, and the new run shows first in the list of R3 with its link.
- R1.6 On a 503 the screen falls back to what it does today: it opens Claude Code with the text prefilled. The « Construire » link is unchanged.

## R2. A decision keeps its conversation

- R2.1 A decision on a proposal fires the routine as today. When the fire succeeds, the API stores a routine run with trigger `proposition` and the memory slug as subject.
- R2.2 The decision's answer and status are unchanged, whatever the fire does. A failure to store the run never fails the decision.
- R2.3 Cancelling a decision fires nothing and stores nothing, as today.

## R3. The owner finds the conversation again

- R3.1 `GET /api/routine/runs` (session required) answers `{ items: RoutineRun[] }`, the 20 most recent, newest first.
- R3.2 The Message screen lists them under the composer: what started it (« Message » or « Décision »), the subject, its age, and a link « Ouvrir » to `sessionUrl`. A run without an address shows no link.
- R3.3 The link is a plain anchor the owner taps. It is not opened by script, because a phone hands a `claude.ai/code` address to the Claude app only on a tap (inferred from `docs/knowledge/claude-code-links-open-in-the-app-on-a-phone.md`, not verified on a phone).
- R3.4 The list is hidden while it is empty.
- R3.5 After a decision, the list is refreshed the next time it is shown.

## R4. Only an address of Claude Code is stored

- R4.1 `sessionUrl` is kept only when it is `https://claude.ai/code/` followed by letters, digits, `_`, `-` or `/`, 300 characters at most. Anything else is stored as null.

## R5. Documents

- R5.1 `CONTRAT.md` documents both routes, the `message:` line, the stored run and the Message screen.
- R5.2 `VOCABULARY.md` gains the term « Routine run ».

## Out of scope

Creating the SSM parameters (`fire-url`, `fire-token`, `secret-phrase`): the owner does it. The agent's routine must read the `message:` line; that lives in the agent repository.
