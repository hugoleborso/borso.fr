---
date: 2026-11-23
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#381'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/components/atoms/MemberMark.tsx]
time-to-detect: days
tags: [pragma, frontend, process, visual-validation]
zone: apps/pragma/site/src/components/atoms/MemberMark.tsx
weak-point: prose-stands-in-for-a-check
recurs: [the-session-that-redrew-the-scope-twice]
---

# A colour dot that named nobody

## User impact

Every band member reading pragma on a phone was affected. The operator reported it with a phone screenshot two days after PR #381 merged.

| | Seen | Expected |
| --- | --- | --- |
| Flames sheet, task row, setlist change tonight (after PR #381) | A colour dot alone, and "Today counted" on every row | The member's name beside the mark |

## Causal chain

- The band read five coloured dots on a phone and could not tell who was who.
  - PR #381 (commit `e9d5089e2`) removed the written name beside every member mark, and moved it into the mark's `aria-label` and `title`.

    ```diff
    # apps/pragma/site/src/components/molecules/TaskRow.tsx in e9d5089e2
    -            <span className="inline-flex items-center gap-1 text-meta text-ink-soft">
    -              <MemberMark shape="dot" color={props.assignee.color} />
    -              {props.assignee.name}
    -            </span>
    +            <MemberMark
    +              shape="dot"
    +              color={props.assignee.color}
    +              role="img"
    +              aria-label={props.assignee.name}
    +              title={props.assignee.name}   # ❌ a dot draws no initial, and a title shows only on hover
    +            />
    ```

    - The implementation followed rule 1 of `docs/features/pragma/icons-over-words/spec/spec.md`: "Where a member's avatar, chip or colour dot is shown, their name is not written beside it. The mark carries the name as its accessible name and as a tooltip (`title`)."
      - The spec's first visible assertion chose hover as the way to name someone: "hovering the mark names them on a desktop." It names no phone gesture.
        - The operator chose the scope on 2026-11-19 as categories, "members and instruments everywhere". The spec turned the category into one rule for every mark. (Man)

## Root cause of occurrence

*Thought every member mark identifies its member once it carries the name as a tooltip, actually only an avatar draws an initial, and a tooltip does not exist on a phone.*

Man. The session that wrote the spec had CLAUDE.md in its context, as every session does. It says "Every page works at 375 px wide" and "Removing, narrowing or adding anything a user sees beyond the ask is a product call. List each one in the question." The prior that a mark plus a tooltip names someone won over both. The spec's own text shows the desktop frame of mind: its only naming gesture is hovering. Under the agentic rule, a Man cause is held by a gate, not by one more document.

## Detection failure causes

- **Typing:** `MemberMark` took any span attribute, so a `dot` with `aria-label` and `title` compiled.
- **Tests:** PR #381 asserted the defect as the goal, with `queryByText('Gui')).toBeNull()`.
- **Visual validation:** the validator checks the assertions of the spec it is given. It checked the six screens the spec listed, and the diff changed thirteen.

## Countermeasure

PR #388 wrote the name back on eight screens and dropped the repeated status on the Flames sheet.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file.

```diff
-export interface MemberMarkProps
-  extends HTMLAttributes<HTMLSpanElement>, Omit<MemberMarkVariantProps, 'ink' | 'shape'> {
+type EmptyProps = Omit<SpanProps, 'aria-label' | 'title' | 'role' | 'children'>;
+type EmptyMark = { readonly shape: 'dot' | 'ring' } & EmptyProps;
+type HoldingMark = { readonly shape: 'cell' | 'lane' } & SpanProps;
+export type MemberMarkProps = MarkBase & (EmptyMark | HoldingMark);
```

A `dot` or `ring` takes no `role`, `aria-label`, `title` or children, and renders `aria-hidden`. A mark that names nobody can no longer pretend to name someone, so a call site must write the name beside it. The type still holds today in `apps/pragma/site/src/components/atoms/MemberMark.tsx` (read this session).

**Proposed:** close the gap that let the spec's screen list drift from the diff. `/visual-validation` would list the routes whose components the diff touches, and fail when one of them has no row in the report. The six-of-thirteen gap of PR #381 would then fail validation before the merge. Feasibility is unverified: pragma has no route-to-component map today (inferred, none found under `apps/pragma/site/src`).

**Proof it can fail:** `<MemberMark shape="dot" color="#000" role="img" aria-label="Gui" title="Gui" />` in a scratch file fails `tsc` with `TS2322 ... is not assignable to type 'IntrinsicAttributes & (MemberMarkProps & RefAttributes<HTMLSpanElement>)'`.

**Not covered:** the spec defect itself. A future spec can still order a name removed from a phone screen, and a `cell` or `lane` mark still accepts a `title`.

**Similar instances:** `grep -rn 'shape="\(dot\|ring\)"\|shape={' apps/pragma/site/src --include=*.tsx` finds four dots and two rings, in `ConcertFriendsCard`, `SetlistEntryRow`, `StreakSheet` and `TaskRow`, each beside a written name.
