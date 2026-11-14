# Visual validation — A member's own write keeps another member's change visible

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-14T09:57:49Z
- Tooling: agent-browser 0.41.2

Scope set by the operator: only the spec's two-browser acceptance, on the songs screen and the setlists screen. Two sessions ran, `--session hugo` and `--session marc`, signed in as the seeded Hugo and Marc. The viewport was 375 × 812. The *Behaviour* items and the hook-test acceptance belong to `technical-validator` and were not rerun here.

For each screen, Hugo's cached list was inactive when Marc's stale message arrived. Hugo's own write then went to that same list. Then Hugo reloaded and opened the list. Cache state comes from the persisted cache, `localStorage['pragma.query-cache']`, read with `agent-browser eval`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Acceptance (songs, setup) | Hugo's songs list is cached and fresh before Marc's change | Hugo opens `/catalog`, then goes client-side to `/catalog/e20d…/edit` (Last Call), which does not mount the list | `./visual-validation-2026-11-14-0952/01-hugo-catalog-before.png`; persisted `["songs","list"] inv=false`, Afterglow titled `Afterglow` | PASS |
| 02 | Acceptance (songs, Marc's change) | Marc changes a song | Marc renames Afterglow to `Afterglow by Marc` on its edit page | `./visual-validation-2026-11-14-0952/02-marc-renames-song.png`; Marc's h1 = `Afterglow by Marc` | PASS |
| 03 | Acceptance (songs, stale message) | Marc's change makes Hugo's inactive songs list stale | Read Hugo's persisted cache | `["songs","list"] inv=true at=1794650020428`, still holding `Afterglow` (not refetched while inactive) | PASS |
| 04 | Acceptance (songs, Hugo's own write) | Hugo's own write leaves the list stale and shows his write at once | Hugo changes Last Call's artist to `Volt by Hugo` and saves | Persisted `["songs","list"] inv=true at=1794650086535`: the list now holds `Volt by Hugo` (fresh `dataUpdatedAt`) and is still invalidated. Its Afterglow title is still the old one | PASS |
| 05 | Acceptance (songs, after reload) | Marc's change to a song shows on Hugo's screen after Hugo's own write and a reload | Hugo reloads, then taps the Songs nav link | `./visual-validation-2026-11-14-0952/03-hugo-catalog-after-own-write-and-reload.png`; list text `Afterglow by Marc … \| Last Call Volt by Hugo …`; `errors` empty | PASS |
| 06 | Acceptance (songs, control) | The refetch in row 05 comes from the kept staleness, not from every reload | With no change pending, reload `/catalog/e20d…`, clear requests, open Songs; then reload `/catalog` | `network requests --filter /api/` shows no request on the navigation. The `/catalog` reload sent only `GET /api/realtime/ticket`, no songs `GET` | PASS |
| 07 | Acceptance (setlists, setup) | Hugo's setlists list is cached before Marc's change | Hugo opens `/setlists`, Marc creates the setlist `Rappel`, and Hugo's open list picks it up live | `./visual-validation-2026-11-14-0952/04-hugo-setlists-before.png`; list text `Rappel … \| Set principal …` | PASS |
| 08 | Acceptance (setlists, Marc's change) | Marc changes a setlist while Hugo's list is inactive | Hugo sits on `/sessions/2076…` and Marc renames the setlist to `Final encore by Marc` | `./visual-validation-2026-11-14-0952/06-marc-renames-setlist-while-hugo-on-session.png`; Hugo's persisted `["setlists","list"] inv=true`, holding `Encore by Marc` | PASS |
| 09 | Acceptance (setlists, Hugo's own write) | Hugo's own write leaves the list stale, shows at once and sends no read | Hugo detaches Set principal from the session (Actions, then Detach) | `./visual-validation-2026-11-14-0952/07-hugo-detaches-setlist.png`. Persisted `["setlists","list"] inv=true at=1794650241262`, with `Set principal` now on 0 sessions. The only `/api/` request is `DELETE /api/setlists/c4d0…/sessions/2076…`, no `GET` | PASS |
| 10 | Acceptance (setlists, after reload) | Marc's change to a setlist shows on Hugo's screen after Hugo's own write and a reload | Hugo reloads, then taps the Setlists nav link | `./visual-validation-2026-11-14-0952/08-hugo-setlists-after-own-write-and-reload.png`; `GET /api/setlists` sent on mount; list text `Final encore by Marc … \| Set principal … Attached to no session`; `errors` empty | PASS |

The pixel-content scan returned `[]` after each of the eight screenshots, so no image is broken.

## Notes

- No FAIL or UNVERIFIABLE rows.
- On the setlist editor (`/setlists/c4d0…`) and in the session's "Add a setlist" dialog, Hugo's setlists list is observed. Marc's rename there refetched it live (`inv=false`, already holding Marc's name). That path passes whether or not the fix is present, so the setlists rows use the session page and the Detach write, where the list is not observed.
- The run changed the local dev database. Afterglow is titled `Afterglow by Marc`. Last Call's artist is `Volt by Hugo`. A setlist `Final encore by Marc` exists. Set principal is detached from the Le Petit Bain session.
- Row 05's screenshot cuts the title to `Afterglow by …` at 375 px. The DOM text and the `AB` initials confirm the full new title.

## Verdict: PASS
