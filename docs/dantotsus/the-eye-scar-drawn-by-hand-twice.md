---
date: 2026-11-23
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#389'
fix-commits: [8789eacc4, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-hand-drawn-art.core.ts, scripts/hooks/hook-events.ts]
time-to-detect: hours
tags: [hooks, agents, frontend, skull-king, design]
zone: apps/skull-king/site/src/components/atoms/PiratePortrait.tsx
recurs: none (the first entry on illustrations an agent draws by hand)
---

# The eye scar drawn by hand twice

## User impact

The operator rejected art an agent drew by hand four times in one pull
request, and asked twice what an avatar meant. Measured from the friction
log archived at `docs/features/skull-king/score-keeper/kaizen.md` and the
commits of PR #389.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-23 11:02 | Hand-drawn icon SVG paths, "ugly", no reuse of `lucide-react` already in the repo | Icons from an installed set |
| 2026-11-23 12:30 | Player avatars shipped as icons twice, hand-drawn then lucide | A question on what an avatar meant, with candidates |
| 2026-11-23 17:13 and 17:51 | An eye scar redrawn as two strokes, then one slash, rejected twice | A free-licensed scar picked from candidates |
| 2026-11-23 17:51 | "Stitched wound" by Lorc from game-icons.net, CC BY 3.0, accepted | The same, on the first try |

The operator's words in the transcript: "C mais moins fait par toi en svg.
Trouve des assets" (12:29), and "Bah non c'est super moche. Trouve des svg de
cicatrice online." (17:41).

## Causal chain

- The operator rejected the eye scar twice and asked for art found online.
  - Each scar was SVG path data an agent wrote into `PiratePortrait.tsx`,
    with no source.
    - The spec told the implementer to draw it. `spec.md`, *Pirate avatar*:
      "The tricorne, the bandana, the scars, the gold hoop, the gold tooth,
      the pipe and the parrot are drawn by this app in `PiratePortrait.tsx`".
      - The spec copied the decision of
        [ADR-2026-11-23T1659](../adr/2026-11-23T1659-skull-king-pirate-avatars.md),
        ratified at 16:59, before both scars: "No free vector kit found has
        pirate parts beyond an eyepatch, so whatever kit is chosen, some parts
        have to be drawn by the app."
        - The ADR's search looked for a kit "whose parts line up", one set
          for every part. It never looked for one asset per part. The accepted
          scar was a single icon from game-icons.net, fitted into the
          avataaars frame. **Material** for the implementer, who drew what
          the ratified input said to draw.

## Root cause of occurrence

*Thought a pirate part had to come from one kit whose parts line up, or else
be drawn by the app, actually a single free-licensed asset per part, fitted
into the face's frame, was what the operator accepted.* Material: the ADR and
the spec handed that belief to the implementer as a decision.

The ADR's own criteria show the risk was known: "Hand-drawn looking parts
were refused before". The decision answered it with "match the kit's
proportions and flat style", a quality bar for drawing, not a search.

## Detection failure causes

- **ADR ratification:** the ADR stated "no free vector kit found" with no
  search listed, so the operator ratified a negative nobody could check.
- **Hooks:** no hook looked at path data being written at the time.
- **Visual validation:** it checks a screen against the spec, and the spec
  said the app draws the parts.

## Countermeasure

The operator approved the rule on 2026-11-23: never hand-draw an
illustration. Search free-licensed assets (iconify, game-icons, CC0 packs),
composite candidates on the real screen side by side and let the operator
pick before coding. The scar shipped as "Stitched wound", recorded in the
ADR's consequences.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`8789eacc4`](https://github.com/hugoleborso/borso.fr/commit/8789eacc4)
added the check as a shell hook. Commit
[`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4) deleted
`.claude/hooks/pretool-no-hand-drawn-art.sh` and ported it to
`scripts/hooks/checks/no-hand-drawn-art.core.ts`, registered in
`scripts/hooks/hook-events.ts`.

```ts
const SITE_SOURCE = /\/apps\/[^/]+\/site\/src\/.*\.(tsx|ts|svg)$/u;
const PATH_DATA = /\bd(=\{?|: ?)["'`][Mm][^"'`\n]{24,}/u;
const ASSET_SOURCE = '@AssetSource';
```

A Write or Edit that puts SVG path data in an app's site source is refused
unless the file names its source with `@AssetSource <url> <license>`. The
refusal carries the operator's procedure.

The check has two gaps, read from its code. `SITE_SOURCE` covers only
`site/src`, so a drawn `apps/*/site/public/*.svg` passes. Its `tools` include
`Bash`, but it reads `tool_input.file_path`, which a Bash call does not carry,
so a heredoc or `sed` write passes. The test file asserts that second gap
as intended: "passes a call that names no file, such as a Bash call".

**Proposed:** three changes. Widen `SITE_SOURCE` to `site/(src|public)`. For a
Bash call, run the check on the files the call changed rather than on
`file_path`. Correct the spec's *Pirate avatar* sentence, which still says the
scars "are drawn by this app", so the next agent that reads it is not told to
draw. Together they make path data with no source impossible to write by any
tool, and remove the input that asked for it.

**Proof it can fail:** `scripts/hooks/checks/no-hand-drawn-art.core.test.ts`
"refuses path data with no named source, which the operator rejects on
sight".

**Similar instances:** `git ls-files 'apps/*/site/public/*.svg'` lists the
public SVGs the check does not read. Ten site files in other apps held path
data with no marker when the hook shipped. It fires only when one gains new
path data.
