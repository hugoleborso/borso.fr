---
date: 2026-05-14
introduced-at: implementation
detected-at: production (user-reported)
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-pr: https://github.com/hugoleborso/borso.fr/pull/12
fix-commits: [5c61a2b]
eradication-level: 1
time-to-detect: hours — Hugo hit it on the second submit-after-pick cycle
tags: [react, forms, async, file-upload]
---

# `file.text()` started in `onChange`, lost the race with the submit click

## Symptom

After switching the GPX field from a `<textarea>` to a `<input
type="file">`, Hugo started seeing intermittent 400s when submitting
the edition setup:

```
Données invalides → gpxXml: String must contain at least 1 character(s)
```

The file picker had been used, the chosen file showed up in the panel,
and the textarea was gone — yet the API was getting `gpxXml: ""`.
Reproducible by picking a file and submitting fast enough; the
file.text() promise hadn't resolved yet.

## Root-cause chain

1. **Why did the API receive an empty `gpxXml`?**
   `handleSubmit` read `gpxXml` from React state. State was still `""`.
2. **Why was state still `""`?**
   The `onChange` handler kicked off `file.text()` (async) and called
   `setGpxXml(content)` only after the promise resolved.
3. **Why did the submit beat the read?**
   `file.text()` is genuinely async; on a quick pick-then-submit it
   loses to a synchronous click that fires `handleSubmit` immediately.
4. **Why was the read started in `onChange` at all?**
   I wanted to show the loaded byte-count under the input. Doing the
   read at pick time was the shortest path to that UX.
5. **Why didn't I notice in dev?**
   On localhost the read resolves in <1 ms, well before any submit.
   The race only appears on slower disks / network-backed file
   abstractions.

**Root cause:** *I thought storing the read **content** in state during
`onChange` was equivalent to storing the **file reference** and reading
at submit. Actually `onChange` is sync-by-contract but `file.text()`
isn't, so the storage races the submit on real I/O.* If I had known
the read must happen inside the same async handler that gates the API
call, I would have kept a `File | null` ref in state and read it inside
`handleSubmit` from day one.

## Detection failure causes

- **Typing:** `setGpxXml(content)` is just `setState<string>` — no
  type-level signal that the value won't have landed by submit time.
- **Linter / static analysis:** n/a.
- **Functional validation locally:** localhost disk reads in <1 ms,
  state always updated before the user could submit. The race didn't
  reproduce locally.
- **CI (tests / build):** no integration test drives the file-picker
  → submit path; it would need a full browser fixture.
- **Code review:** same session shipped both halves of the race.

## Countermeasure

`apps/last-loop-lepin/site/src/components/admin/SetupPanel.tsx`:

- `gpxFile` state now holds the `File` reference (or `null`).
- `onChange` only stores the file; no async work.
- `handleSubmit` awaits a `readGpxFromState()` helper that calls
  `file.text()`, validates the result is non-empty, and only then
  POSTs.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

Reading the file inside the same async handler that gates the API call
removes the race: the submit cannot fire its network call until the
read has resolved. The new shape — *hold the source, transform at
boundary* — is the structural rule: any future form field that wraps
an async input now follows this template.

**Reference:** [PR #12](https://github.com/hugoleborso/borso.fr/pull/12) ·
commit [`5c61a2b`](https://github.com/hugoleborso/borso.fr/commit/5c61a2b)

**The actual fix (excerpts):**

```diff
-  // gpxXml: text content, set asynchronously in onChange
-  const [gpxXml, setGpxXml] = useState('');
+  // Hold the picked `File` rather than its text content. Reading via
+  // `file.text()` is async — if we kicked it off in `onChange`, a quick
+  // submit could race the read and POST an empty `gpxXml`. Reading at
+  // submit time removes the race.
+  const [gpxFile, setGpxFile] = useState<File | null>(null);
```

```diff
   async function handleSubmit(event: React.FormEvent): Promise<void> {
     event.preventDefault();
+    const gpxXml = await readGpxFromState();
+    if (gpxXml === null) {
+      setError("Choisis un fichier GPX avant de créer l'édition.");
+      return;
+    }
     await apiClient.adminCreateEdition({ slug, ...basePayload, gpxXml });
   }
```

**Sibling defects swept:** the same pattern lives in
`RunnerAdminPanel.tsx` for the photo upload, which already reads the
file inside the submit handler (`uploadPhoto(slug, photoFile)`); no
fix needed there.

## See also

- [`docs/knowledge/ios-files-picker-uti-greys-extensions.md`](../knowledge/ios-files-picker-uti-greys-extensions.md)
  — the other file-picker quirk hit during the same iteration.
