---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#12'
fix-commits: [5c61a2bd1d]
eradication-level: 5
eradication-paths: [apps/last-loop-lepin/site/src/components/organisms/useGpxFile.ts, apps/last-loop-lepin/site/src/components/atoms/FileInput.tsx]
time-to-detect: hours, the operator hit it on the second pick-then-submit
tags: [react, forms, async, file-upload]
zone: apps/last-loop-lepin/site/src/components/organisms/SetupPanel.tsx
---

# `file.text()` started in `onChange`, lost the race with the submit click

## User impact

The operator, setting up a race edition on last-loop-lepin, picked a GPX file
and submitted. He got an intermittent 400 (his report):

```
Données invalides → gpxXml: String must contain at least 1 character(s)
```

| | Seen | Expected |
| --- | --- | --- |
| Pick a GPX file, submit at once | The panel shows the file, the API answers 400 on an empty `gpxXml` | The edition is created with its track |

It reproduced by picking a file and submitting quickly. Only the organiser's
setup panel was affected.

## Causal chain

- The API received `gpxXml: ""`.
  - `handleSubmit` read `gpxXml` from React state, which was still `""`.
    - The file's `onChange` started `file.text()` and set the state only when the promise resolved, after the click had already submitted.

      ```tsx
      setGpxFileName(file.name);
      file
        .text()
        .then((content) => setGpxXml(content)) // ❌ resolves after a quick submit
        .catch((caught: unknown) => {
          setGpxXml('');
      ```

      - Commit `7c6ce0187` (2026-05-14, written by an agent) swapped the GPX `<textarea>` for a file input and kept the `gpxXml` string state the textarea had filled synchronously. It read at pick time to show the byte count under the input.
        - The commit edited the form in place, and the textarea's shape, content held in state, carried over to an input whose content arrives later. The same app already had the right shape one file away: `RunnerAdminPanel.tsx` held `useState<File | null>` and set it with `onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}`. The smallest diff kept the existing state over the example. (Man)

## Root cause of occurrence

*Thought holding the file's content in state at pick time was the same as holding the file and reading it at submit, actually `onChange` returns before `file.text()` resolves, so a submit can run between the two.*

Man. The agent changed the input and kept the state around it, because the
smallest change reused the `gpxXml` string. A correct file input already
existed in the same app, in `RunnerAdminPanel.tsx`
(`git show 7c6ce0187^:apps/last-loop-lepin/site/src/components/admin/RunnerAdminPanel.tsx`,
line 132). Whether that panel was in the agent's context is unknown, because
the transcript was not read (inferred). If it was not, the cause is Material.
Either way one more example cannot be the fix, since one already existed. Only
a gate that refuses the shape holds when the prior wins.

The commit message says what it believed: "On change, `file.text()` reads
UTF-8 content into the existing `gpxXml` state. Shows file name + kB loaded
after selection." `Blob.text()` returns a promise, so the state is set on a
later task than the change event (inferred from the API's shape).

## Detection failure causes

- **Typing:** `setGpxXml(content)` is a `setState<string>`. Nothing in the type says the value lands later.
- **Local:** a localhost read resolves before a person can click, so the race did not reproduce.
- **CI:** no test drives pick then submit. It needs a browser and a slow read.
- **Review:** the same session wrote both halves of the race.

## Countermeasure

Commit [`5c61a2b`](https://github.com/hugoleborso/borso.fr/commit/5c61a2b)
holds the picked `File` in state, does no work in `onChange`, and reads the
text inside `handleSubmit` before the POST. An empty read shows "Choisis un
fichier GPX avant de créer l'édition." instead of posting.

## Eradication

**Type:** knowledge (level 5). A blueprint shows the shape. Nothing refuses
the old one, and the defect happened next to a correct example, so a blueprint
alone is not expected to stop it.

**Reference:** commit `fcc8e1c30` (2026-08-08) moved the logic into
`useGpxFile.ts`. Commit `f2fa6f626` (2026-08-10) marked it as the blueprint
`hook-stateful-helper`: "the file is read inside `readRequired` and
`readOptional`, which run from the submit handler rather than from a
subscription to the picked file." The atom `FileInput.tsx` hands its caller a
`File | null`, never content.

```ts
async function readText(): Promise<string | null> {
  return file?.text().catch(() => null) ?? null;
}
```

**Proposed:** two changes would make the race impossible rather than
discouraged. Read the file at submit through `FormData` from the form element,
so no component state holds it, and show the byte count from `File.size`,
which is synchronous. Then a lint rule under `eslint-rules/` refuses a call to
`.text()` or `.arrayBuffer()` inside an `onChange` handler of a form field.
Together they leave no place where content read at pick time can reach a
submit.

**Proof it can fail:** none yet. A blueprint refuses nothing.

**Similar instances:** `grep -rn 'type="file"' apps/*/site/src` finds
`FileInput.tsx`, pragma's `TakeUploadForm.tsx`, which stores the `File` in its
form field, and `SongChartCard.tsx`, which uploads on pick and has no submit to
race.
