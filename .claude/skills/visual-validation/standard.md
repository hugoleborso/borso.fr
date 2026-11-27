# Visual validation — standard

Why the gate exists and where its edges are. The rows the validator builds, its
tooling and its report format live once in
[`../../agents/visual-validator.md`](../../agents/visual-validator.md). The
dispatch brief is in [`template.md`](./template.md).

## What a visual validation is

A visual validation **opens the implemented feature in a browser and checks,
point by point, that every assertion the spec makes about visible behaviour
holds.** It catches code that compiles but renders nothing, buttons that do not
do what the spec says, edge cases the implementer never tried, and a layout
right only at the developer's resolution. A failing one halts the push. There
is no half-credit.

## Why standalone

The agent that implemented a feature, asked to validate it, finds it fine. The
validator runs in a fresh Agent invocation with no chat history, no
implementation summary and no narrative pressure. The dedicated agent's
definition carries the rules, which is why `general-purpose` is never
dispatched.

## Why the row rules exist

- **One row per artefact.** The band's panel in `pragma`'s audience-voting spec
  carried five things, and the checklist asked only whether a round could be
  opened from it. The panel shipped on a PASS without the live standing the
  feature existed to show. See
  [`the-panel-that-paid-for-a-poll-it-never-rendered.md`](../../../docs/dantotsus/the-panel-that-paid-for-a-poll-it-never-rendered.md).
- **Write reachability.** A setlists index listed only concerts that already
  had a setlist, so a band whose every concert had one could create no other
  anywhere.
- **Pixel-content checks.** DOM assertions pass on an image that never
  rendered.

## What does not get validated

- Performance metrics that need a baseline (LCP, INP, bundle size).
- Cross-browser parity. The validator runs Chromium only.
- Pixel-perfect diff against a golden image, unless the spec asks for it and
  the golden images are checked in. Design-bundle fidelity is the exception
  the agent describes.

## Verdict semantics

One tag per assertion:

- **PASS**: observed to hold, with a screenshot or a deterministic check in
  the row.
- **FAIL**: observed not to hold, with the screenshot or the contradicting
  value.
- **UNVERIFIABLE**: not concrete enough to test, or a tooling limit prevents
  observing the state, with a one-line note.

## Where evidence lives

The report is always committed. Its screenshots split by verdict, per
[ADR-2026-09-21T0819](../../../docs/adr/2026-09-21T0819-validation-screenshots-leave-git-for-the-previews-cdn.md):

- **A screenshot a FAIL row references is committed**, beside the report. A FAIL report
  without the screenshot it references is unrebuttable.
- **Every other screenshot waits in the gitignored `.pending-upload/`**, then `/open-pr`
  publishes it to the previews CDN, which expires it after 60 days. The report cites it by its
  published URL, never by a local path.

`.gitignore` names only `.pending-upload/`, never the validation folder, because the FAIL set
lands there. Which files reach git is decided by the skill's step 7, not by an ignore pattern.

**When the upload is denied, commit everything.** A denial is not a failed validation. It needs `s3:PutObject` on the screenshots
prefix, which [`docs/aws-setup.md` §12.6](../../../docs/aws-setup.md) grants by hand. Move the
staged files beside the report, commit them, rewrite the report's URLs as relative paths, and
say so in one line. Dropping a PASS run's evidence would turn the report into "trust me".
