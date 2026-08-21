---
date: 2026-08-20
introduced-at: scripts/architecture
detected-at: editing the generator
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a
tags: [architecture-maps, template-literals, tooling]
---

# Editing the architecture page's runtime script

The browser-side script of the generated architecture map is emitted from a
**template literal** in `scripts/architecture/architecture-graph-view.ts`. Two
consequences are easy to trip over.

## A literal backtick closes the template

Typing a backtick anywhere in that file's runtime script ends the template two
files upstream, and the error surfaces somewhere unrelated. Where the script
genuinely needs one, it is built as `BACKTICK = String.fromCharCode(96)`. That
constant marks the one place it already bit; nothing prevents the next backtick.

## A comment inside the template is invisible to `borso/no-comments`

The rule reads a file's *comments*, and text inside a string literal is not a
comment. So the repository's no-comments gate passes on this file while the
script it emits still ships comments into the published page. Those were removed
by hand, and a future edit can reintroduce them without any gate objecting.

Check the emitted script, not just the source, when editing here:

    node -e "const {GRAPH_RUNTIME_SCRIPT}=await import('./scripts/architecture/architecture-graph-view.ts')"

## A related limit in the hotspots report

`git log --follow` accepts **one path only**, so following every file costs one
git process per file. `scripts/standards/hotspots.ts` does not pay that, which
means a moved file reads as new. That understates churn — it hides a hotspot
rather than inventing one, which is the safe direction for that report.
