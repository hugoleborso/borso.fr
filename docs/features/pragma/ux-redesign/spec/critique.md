# Spec review: pragma UX redesign

Reviewer: `spec-critic`, on 2026-10-27. Inputs: [`spec.md`](./spec.md), ADR-0047 to ADR-0051, the 37 confirmed findings in [`baseline/verified-findings.md`](./baseline/verified-findings.md), the measured baseline in [`baseline/baseline.md`](./baseline/baseline.md), the critic's [`design/comparison.md`](./design/comparison.md), the solution designer's proposals and answers to the operator's comments under `../audit/solution-designer-2/`, and `apps/pragma/VOCABULARY.md`.

## Verdict

Every ratified decision (D1, D2, D3, D6, D7 revised, D8, D9, D10, D11) and every operator comment was already in the spec. D4 and D5 are out of scope, as ratified. The gaps were in coverage of a few confirmed findings, in acceptance criteria that no slice owned, in a slice gate that would have failed on its own first commit, and in vocabulary. All of those are fixed in place. Five questions remained for the operator; the operator answered them on 2026-10-27 (see the last section).

## What I changed

### Findings that no slice covered

| Finding (rank) | What the spec said | Change |
| --- | --- | --- |
| 2: tapping a task loads a form 1840 px down | Only **New task** opened a sheet | Tapping a task opens the same sheet filled with its values (Band tab). |
| 13 and 31: the add button hides on scroll | The strip was described, not its behaviour | The strip never hides on scroll, written in the setlist section and in the placement rule. |
| 20: removing More hides the account link and the language switch | The More drawer went, and nothing said where these two go | Band lists the account page last; the language switch moves onto the account page (slice 2). |
| 21: `/tasks` is 493 px wide | Measured in slice 5 although Band shows tasks from slice 2 | Task chips wrap in slice 2, and the width row moved to slice 2. |
| 23: sheets put focus on Cancel or Close | Stated for three sheets only | The `Sheet` rule focuses the first field; a new acceptance row counts the sheets that do not. |
| 25: vote page (ghost button, no back link, 2.80:1 toggle) | Task 11 had a target but no slice and no screen | New *Vote page* section, a task 11 happy path, and the page in slice 3. |
| 29: a button inside a link | Not mentioned | Rule: a control that navigates is a `ButtonLink`; acceptance row "Buttons inside a link: 5 places -> 0" (count from the solution designer's C6). |
| 35: Studies and Improvements share an icon | Not mentioned | One icon per destination as well as per verb. |
| 37: theme colours fixed to light | Only the manifest shortcut was covered | `index.html` theme colour per scheme, in slice 2. |
| Solution designer's C9: an empty "Prepared concert" picker on a past practice | Not mentioned | Hidden on the session page (slice 5). |

Ranks 9, 10 and 11 (offline and stale order) stay out of scope, as the spec already said. Every other confirmed finding was covered.

### The critic's defects that the grafts would have carried over

- Backstage's floating "Record a take" pill covered the chord chart. The song page and the setlist now pad their end by the strip's height.
- Backstage's lineup grid squeezed two instruments into one cell. A new edge case keeps both glyphs readable and the cell at 44x44 px.
- The critic left Notebook's primary fill against the page unmeasured. The contrast fixes now include the borderless secondary pill's fill against `paper` and `raised`.
- The vote toggle failed because a class named a token `tokens.css` never defined. A test now fails the build on an undefined colour token.
- Backstage's cover mosaic was praised by the critic but not recommended. It is written down as "not taken", because it would push the first row down.

### Acceptance criteria

- Every task row and every route row now names the slice that must meet it. Before this, task 11 and twelve route rows had no slice.
- Three before values ("about 265 px", "about 5" twice) were read from screenshots, not measured. They are marked as such, and slice 1 records the real value with the harness before changing the app.
- Slice 1's harness check said "within its own run-to-run noise", which nothing measures. It now requires the same counts as `baseline.json` for every task, run before any other change in that slice.
- Task 8 had a target of 8 taps and "never leaves for another tab". That was impossible once the operator ruled that songs are added from the setlist: the only way to put a new song on a practice was the catalogue, then another tab. The Add songs sheet now lists the music service's results for a title that is not in the catalogue, next to **New song as an idea**. Task 8 runs from the setlist with a target of at most 5 taps, 1 text entry and 3 screens, which is the solution designer's 4 taps plus a margin. Task 8 moved from slices 4 and 6 to slice 4.
- The "routes with two or more scroll areas" target was 0 in slice 1. The one-scroll gate would have failed on its first commit, because `/catalog/:songId/edit` is only rebuilt in slice 6. The row now reads 1 after slice 1 (growing text areas fix `/bars`) and 0 after slice 6, and the gate lists that one route as its exception until then.
- The rule "a sheet never opens another" would also have failed in slice 1, because today's lineup dialog opens from the entry sheet until slice 3 removes it. The rule is now gated from slice 3.

### Slices

- Slice 1 now says what "no structure change" includes: every button gains its icon, and the 14 dialogs move onto `Sheet` with their content unchanged.
- Each slice's acceptance now points to the rows marked with its number, instead of repeating a partial list.
- The dependency note was wrong. Task 8 no longer needs slice 6. Slice 5 needs slice 4, because the session's **Add songs** opens the Add songs sheet.

### Decisions I took (implementation, not product)

- Q4: keep JetBrains Mono. There is no new dependency, and ADR-0048 already assumed it.
- Q5: one batch route that adds a list in one transaction.
- Q2, first half: replace `member-6`, which equals `accent`. The operator asked for the critic's contrast defects to be fixed. Remapping the members' stored colours is a separate question (Q2b).
- Q10, new: "stage mode" is a screen word. Identifiers keep `scene`, the vocabulary's **scene view**.

### Vocabulary

- `chord-sheet-to-chordpro.core.ts` became `chords-above-lyrics.core.ts`, in the spec and in ADR-0051. The vocabulary refuses **chord sheet**; the noun is **chord chart**. Six "chord sheet" phrases in ADR-0051 now say "chord chart".
- "Rehearsal" became "practice" in the spec (task names, the output metric) and in ADR-0048. Task numbers still match `baseline.json`.
- "Every member's part" became "every member's instruments". The screen labels "My part" and "Your part" stay, as Q8 already allowed.
- The spec now notes that `VOCABULARY.md` › Session ("listed newest first") changes with rank 22.

### Consistency and format

- The chords section said a PDF is stored as a file, while ADR-0051 proposes reading its text layer. The section now follows Q6 either way.
- ADR-0048 counted 47 files and the spec 46. Both are correct: 47 files name `font-display`, one of them `tokens.css`, which defines it. Both documents now say 46 components plus `tokens.css`.
- The migration in the spec now matches ADR-0050 and the existing migrations: quoted names and `IF NOT EXISTS`.
- ADR-0050 had two list items run together on one line ("session page.- **Rejection rationale:**"). They are now on separate lines.
- Every markdown link in the spec and the four ADRs resolves. The repository's link checker skips untracked files, so I checked these files with a separate script. That gap is logged in the kaizen file.
- No time estimates are present. The windows "30 days", "1 hour" and "a day" are alert and success thresholds, not estimates of work.

## What remains for the operator

Answered by the operator in chat on 2026-10-27, and folded into the spec and the ADRs the same day.

1. **Accept ADR-0048, Newsreader with optical sizes?** It adds 235,712 bytes to a phone's first load after the release. Recommendation was: accept. **Answered: accepted**, with no objection.
2. **Q6 and ADR-0051: read a PDF's text layer with `pdfjs-dist` (a new dependency, about 506 KB compressed, chord editor only)?** Recommendation was: accept. **Answered: accepted**, with no objection. Q6 is decided as option (b).
3. **Q2b: map each member's stored colour onto the six member tokens?** Recommendation was: yes. **Answered: no.** Members keep their own stored colours, and the colour must stay clearly visible, above all in the Lineup view, so the band learns to recognise each member at a glance. The spec now draws each member's colour as a filled lane in the Lineup grid and as filled lineup avatars, chooses the ink on a member colour by contrast ratio in `member-color.utils.ts`, keeps names in a text token, and drops the six `member-*` tokens. ADR-0047 records the change.
4. **Q3: seven or more members in the Lineup grid.** Recommendation was: show only the members who play in that setlist, and scroll sideways past six. **Answered:** the band has five members. The grid is designed for up to six with no sideways scroll, and more than six is a known limit, not handled.
5. **Q1: the session's primary action.** Recommendation was: **Open the setlist** before the date and **Listen back** after it. **Answered:** a "practice in progress" mode is important, because the band records songs during practice. The spec now specifies *Practice mode* for slice 5, built on the takes feature, with three new open questions (Q11 where its state lives, Q12 where its quick note goes, Q13 when it is offered), each with a recommendation; none of them blocks slice 1.

The operator also ratified ADR-0047 (with the member colour change), ADR-0048, ADR-0050 and ADR-0051, which are now marked accepted.
