# Push when a member adds a song

A member who adds a song to the catalogue now pings the rest of the band, so nobody discovers a new song days later.

## Notification triggers after this change

| Event | Fired by | Category toggle | Group key (10 min window) | Opens |
| --- | --- | --- | --- | --- |
| `take-created` | a take recorded or uploaded | `takes` | `take:<takeId>` | `/catalog/<songId>?take=<takeId>` |
| `take-comment-created` | a comment on a take | `take_comments` | `take-comment:<takeId>` | `/catalog/<songId>?take=<takeId>` |
| `song-created` (new) | a song added from the app or the `save_song` tool | `songs` (new) | `song-created:<actorMemberId>` | `/catalog/<songId>` |
| `session-created`, `session-changed` | a session planned or edited | `sessions` | `session:<sessionId>` | `/sessions/<sessionId>` |
| `setlist-changed` | any write to a setlist, its entries or breaks | `setlists` | `setlist:<setlistId>` | `/setlists/<setlistId>` |
| `song-lineup-changed` | a song's default lineup really changed | `setlists` | `song-lineup:<songId>` | `/catalog/<songId>` |
| `transition-changed` | a transition comment written | `setlists` | `transition:<songA>:<songB>` | `/catalog/<songA>` |
| `streak-at-risk`, `streak-band-count` | the 20:00 Paris reminder | `streak` | `streak:<memberId>:<day>`, once a day | `/` |

## Rules every band push follows

- The member who acted never receives it.
- Every category is on until the member turns it off in Settings.
- One group key sends at most once per 10 minutes. Later writes in the window are dropped, not queued.
- A send waits 5 s at most, and a failed send never fails the write.
- A push service answering 404 or 410 deletes that subscription.

## Decisions in this change

- Songs get their own toggle, so a member can mute catalogue growth without muting setlists.
- The group key is per member who adds, not per song. A burst of ten songs pings once, naming the first song.
- Songs created by an audience suggestion, the dev seed and the audit seed do not notify. The audience flow has its own screen, and the seeds are not band activity.
