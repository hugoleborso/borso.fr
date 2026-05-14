# iOS Files greys out file inputs filtered by extensions it doesn't recognise

## Symptom

A `<input type="file" accept=".gpx,application/gpx+xml,text/xml,application/xml">`
shows the `.gpx` file in the iOS Files picker as **greyed out and
unselectable**. Same input on macOS Safari, Chrome, Firefox: file is
selectable.

## Why

iOS Safari + the iOS Files app filter the picker by **UTI** (Uniform
Type Identifier — Apple's type system), not by file extension or
MIME string. The picker walks the `accept` attribute and tries to
resolve each entry to a UTI; entries it doesn't recognise become
hard filters that exclude every file.

`.gpx` has no UTI registered in iOS by default. Neither do
`application/gpx+xml`, `text/xml`, or `application/xml` map to
selectable types for arbitrary `.gpx` files. The picker concludes
"no allowed UTIs match this file" and greys it out.

## Adaptation

**Drop the `accept` attribute** entirely for file types iOS doesn't
recognise. The picker then shows every file as selectable, and the
server validates the content. Example from
`apps/last-loop-lepin/site/src/components/admin/SetupPanel.tsx`:

```tsx
<input
  id="setup-gpx"
  type="file"
  className="input"
  // iOS Files filters by UTI and has no built-in entry for `.gpx`,
  // so any `accept` value greys the file out on the picker. Skip
  // the hint — server-side `parseGpx` rejects non-GPX content
  // with a 400 anyway.
  onChange={…}
  required
/>
```

The trade-off: desktop users get a slightly less curated picker (any
file shows up, not just `.gpx`). The server-side `parseGpx` is the
trust boundary that rejects bogus content with a 400 + a clear
`detail`. Documented in
[`docs/dantotsus/async-file-read-race-on-form-submit.md`](../dantotsus/async-file-read-race-on-form-submit.md)
as the iteration that surfaced this.

## When you really want `accept`

If the file type **does** have an iOS UTI:

- `image/*`, `image/jpeg`, `image/png` — registered.
- `application/pdf` — registered.
- `text/plain` — registered.

Then `accept` is fine on iOS. For unregistered types (`.gpx`,
`.fit`, `.kml`, custom extensions), drop it and validate server-side.

## See also

- [`docs/dantotsus/async-file-read-race-on-form-submit.md`](../dantotsus/async-file-read-race-on-form-submit.md)
  — sibling file-picker pitfall hit during the same iteration.
- WHATWG HTML spec, [§The accept attribute](https://html.spec.whatwg.org/multipage/input.html#attr-input-accept)
  — defines the attribute but leaves "how matching works" to the UA;
  Apple's choice is UTI-based.
