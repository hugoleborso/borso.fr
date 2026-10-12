# Task speed recordings

One video per job, recorded with `pnpm run task-speed -- --videos <dir>` at
375 × 667. The screen before the pass is on the left, the screen after it is
on the right. Each video names the step on screen, rings every tap in red and
ends on the job's numbers.

The left side was recorded by checking out `apps/pragma/site` at `6e1a6b4`
with the journeys as they were written for the baseline, then restoring both.
Its numbers matched `../baseline.json` exactly, and the right side's matched
`../after.json`.

| File | Job |
| --- | --- |
| `my-part.mp4` | See what I play at the next concert |
| `stage.mp4` | Open the next concert on stage |
| `vote.mp4` | Give points in the open setlist vote |
| `add-to-setlist.mp4` | Add a catalog song to the next concert setlist |
| `add-song.mp4` | Add a song to the catalog |
| `add-task.mp4` | Write down a task |
| `add-bar.mp4` | Log a new bar lead |
| `find-chart.mp4` | Open a song's chord chart |
