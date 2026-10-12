# Setlist page pass, and the vote that would not close

Measured at 375 × 667 on the preview seed.

## The vote

The operator reported that closing the vote did not seem to work. The server
side did: `POST /close` locked the setlist and stored the kept songs in the
order shown, across three runs. Three things on the screen made it look
broken.

- **A vote nobody scored was a dead end.** *Close the vote* asked for a
  closing proposal, the API answered 409 `no-votes`, and the page showed
  neither the vote nor a proposal, only *Open a vote*. The vote stayed open.
  `375-before-empty-vote-dead-end.png` is that screen.
- **Reviewing the proposal relabelled the header *Open a vote*,** so the
  screen read as if the vote had already ended.
- **The confirm button sat at the bottom of the proposal,** below the fold
  and under the tab bar, and after confirming the page stayed where it was,
  so nothing said the setlist had changed.

Now *Close the vote* locks the setlist as it stands when nobody scored, the
header offers a way back to the vote while the proposal is reviewed, the
confirm button sticks to the bottom of the screen, and both endings open the
setlist. The proposal query no longer retries a 409.

| Job | Before | After |
| --- | --- | --- |
| Close the vote and keep its result | could not run: stayed on the vote page | 3 taps, 7.4 s |
| Close a vote nobody scored | could not run: dead end | 2 taps, 6.3 s |

`close-vote.mp4` and `close-empty-vote.mp4` show each job, before on the
left and after on the right.

## The setlist page

| Block | Before | After |
| --- | --- | --- |
| First song starts at | 372px | 248px |
| Songs visible above the tab bar | 2 | 4 |

- Scene, vote and a *More actions* menu sit on the back link's row as icons.
  Rename and delete moved into that menu; they are rare and delete was one
  tap from the play button.
- The vote icon is filled only while a vote is open.
- Member filters are one row that scrolls sideways; *All members* reads *All*.
- The energy curve is 40px tall on a phone instead of 56px.

`375-setlist-before-after.png` and `375-more-menu-and-rename.png` show it.
`task-speed.json` holds every job; the eight earlier jobs are unchanged.
