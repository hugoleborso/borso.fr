---
date: 2026-11-23
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#389'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-no-hand-drawn-art.sh, .claude/settings.json]
time-to-detect: hours
tags: [hooks, agents, frontend, skull-king, design]
zone: apps/skull-king/site/src/components/atoms/PiratePortrait.tsx
recurs: none (the first entry on illustrations an agent draws by hand)
---

# The eye scar drawn by hand twice

## User impact

The operator rejected art an agent drew by hand four times in one pull
request, and asked what an avatar was twice. Measured from the friction log
archived at `docs/features/skull-king/score-keeper/kaizen.md` and the
commits of PR #389.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-23 11:02 | Hand-drawn icon SVG paths, "ugly", no reuse of `lucide-react` already in the repo | Icons from an installed set |
| 2026-11-23 12:30 | Player avatars shipped as icons twice, hand-drawn then lucide | A question on what an avatar meant, with candidates |
| 2026-11-23 17:13 and 17:51 | An eye scar redrawn as two strokes, then one slash, rejected twice | A free-licensed scar picked from candidates |
| 2026-11-23 17:51 | "Stitched wound" by Lorc from game-icons.net, CC BY 3.0, accepted | The same, on the first try |

The transcript holds more of the same. 2026-11-22 18:00: "Récupère les images
officielles". 18:08: "Trouve les cartes en meilleure qualité". 18:50: "On peut
faire vraiment mieux sur le logo par pitié". 2026-11-23 12:29, answering the
visual direction: "C mais moins fait par toi en svg. Trouve des assets".
17:41: "Bah non c'est super moche. Trouve des svg de cicatrice online."

## Causal chain

- The operator rejected each drawing and asked for another.
  - Each drawing was SVG path data an agent wrote with no source.
    - Nothing stopped an agent writing path data, and no step said to look
      for existing art first or to show candidates before coding.

## Root cause of occurrence

*Thought an icon or a portrait part is cheap to draw in code, actually a
drawing by a model reads as amateur next to a designed set, and the operator
judges it on sight.*

The accepted scar came from a search, after two drawings. The pirate faces
that shipped came from DiceBear's avataaars, a designed set.

## Detection failure causes

- **Hooks:** no hook looked at path data being written.
- **Spec:** the spec named no source for the art, so "draw it" was open.
- **Visual validation:** it checks a screen against the spec, not taste.

## Countermeasure

The operator approved the rule on 2026-11-23: never hand-draw an
illustration. Search free-licensed assets (iconify, game-icons, CC0 packs),
composite candidates on the real screen side by side and let the operator
pick before coding.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
+[[ "$FILE" =~ /apps/[^/]+/site/src/.*\.(tsx|ts|svg)$ ]] || exit 0
+grep -qE "\bd(=\{?|: ?)[\"'\`][Mm][^\"'\`]{24,}" <<<"$NEW" || exit 0
+grep -q '@AssetSource' <<<"$NEW" && exit 0
+[ -f "$FILE" ] && grep -q '@AssetSource' "$FILE" && exit 0
```

A Write or Edit that puts SVG path data in an app's site source is refused
unless the file names its source with `@AssetSource <url> <license>`. The
refusal carries the operator's procedure.

**Proof it can fail:** fed a new `Scar.tsx` holding
`<path d="M10 20 L30 40 C 12 14 15 16 20 22 Z" />`, with
`KAIZEN_LOG_REFUSALS=0`:

```
[no-hand-drawn-art] This writes SVG path data with no named source, so it is a drawing made by hand.
[no-hand-drawn-art] Search free-licensed art instead: icons already installed (lucide-react), iconify, game-icons.net, CC0 packs.
[no-hand-drawn-art] Composite two to four candidates on the real screen, side by side, publish that image and let the operator pick.
[no-hand-drawn-art] Then put `@AssetSource <url> <license>` in the file and credit it in the app's CREDITS.md.
exit=2
```

The same content with an `@AssetSource` line exits 0. An Edit to
`PiratePortrait.tsx`, which names no source, adding `d: "M4 10 C 8 2 16 2 20 10 Z L 3 3"`
exits 2.

Ten files in other apps already hold path data with no marker. The hook
only fires when one gains new path data, which is the moment to source it.
