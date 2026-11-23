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

| | Seen | Expected |
| --- | --- | --- |
| Flames sheet, task row, setlist change tonight (after PR #381) | A colour dot alone, and "Today counted" on every row | The member's name beside the mark |

The operator reported it with a phone screenshot two days after the merge.

## Causal chain

- The band read five coloured dots and could not tell who was who.
  - PR #381's rule 1 replaced the written name with the mark at every call site.
    - A `dot` or `ring` draws no initial, yet `MemberMark` accepted `aria-label` and `title`, so a named dot compiled.

## Root cause of occurrence

*Thought every member mark identifies, actually only an avatar with its initial does.* A tooltip does not exist on a phone. The scope question asked categories, not screens, although CLAUDE.md asked to list each removal since PR #354.

## Detection failure causes

- **Typing:** a dot took any span attribute.
- **Tests:** #381 pinned the defect with `queryByText('Gui')).toBeNull()`.
- **Visual validation:** it checked the six screens the spec listed, and the diff changed thirteen.

## Countermeasure

PR #388 wrote the name back on eight screens and dropped the repeated status on the Flames sheet.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file.

```diff
-export interface MemberMarkProps
-  extends HTMLAttributes<HTMLSpanElement>, Omit<MemberMarkVariantProps, 'ink' | 'shape'> {
+interface EmptyMarkProps extends UnnamedSpanProps {
+  readonly shape: 'dot' | 'ring';
+}
```

A `dot` or `ring` takes no `role`, `aria-label`, `title` or children, and renders `aria-hidden`.

**Proof it can fail:** `<MemberMark shape="dot" color="#000" role="img" aria-label="Gui" title="Gui" />` in a scratch file fails `tsc` with `TS2322 ... is not assignable to type 'IntrinsicAttributes & (MemberMarkProps & RefAttributes<HTMLSpanElement>)'`.

**Not covered:** an avatar with an initial can still replace a name in a list row. No type tells a dense grid from a row.

**Similar instances:** `grep -rn '<MemberMark' apps/pragma/site/src` finds three dots and one ring, each beside a written name.
