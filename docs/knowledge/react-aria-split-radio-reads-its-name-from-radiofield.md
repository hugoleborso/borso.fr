---
summary: 'In react-aria-components 1.22, a `RadioField` with a `RadioButton` builds the input from `RadioField` props, so `aria-label` on `RadioButton` gives the radio no name; put it on `RadioField` or render a visually hidden label.'
triggers:
  output:
    - 'role "radio" and name'
  commands:
    - '\bRadioButton\b'
---

# A split radio reads its accessible name from `RadioField`

On PR #410, `build-agent` set `aria-label` on each of four icon-only
`RadioButton`s in `PrizeIconChoice.tsx`. The radios had no accessible name
until a `sr-only` span was added inside.

The source explains why (read in `react-aria-components@1.22.1`,
`dist/private/RadioGroup.mjs`):

- `RadioField` calls `useRadio(props, state, inputRef)` with its own props and
  passes the resulting `inputProps` down through a context.
- `RadioButton` takes `inputProps` from that context. Its own props go only
  to `filterDOMProps` for the wrapper element, not to the input.

So the name is decided on `RadioField`. Put `aria-label` there, or keep a
visually hidden text child. A query such as
`getByRole('radio', { name: … })` failing with `role "radio" and name` is the
symptom.
