# ADR-0048: Chord text comes from pasted text and from a PDF's text layer read in the browser; a photo stays an image

- **Status:** accepted
- **Date:** 2026-10-27
- **Ratified:** by the operator in chat on 2026-10-27, with no objection; this answers the spec's Q6 with option (b)
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, ux-redesign, chords, dependency, front-end

## Context

Decision D9 of the redesign, ratified on 2026-10-27, limits chord input to three sources: pasted text, a photo and a PDF, with no scraping and no audio detection. Today a song's chart is one of three kinds (`apps/pragma/api/src/songs/songs.schema.ts:57-59`, read this session): `chordpro` text, or an `image` or `pdf` file stored in S3 through a presigned upload of at most 10 MiB (`MAX_UPLOAD_MEBIBYTES` in `apps/pragma/domain/input-limits.core.ts`) in PNG, JPEG, WebP, HEIC or PDF (`apps/pragma/api/src/uploads/uploads.core.ts`). Only the `chordpro` kind can be transposed, highlighted for a member or shown in the song page's transpose stepper. The spec left the photo and PDF question open (Q6) with three options: (a) store the file, no extraction; (b) extract on the phone; (c) extract with a cloud service.

What makes the question hard is not reading characters but keeping columns. A chord chart from a chord website is laid out "chords above lyrics": a chord's horizontal position says on which syllable it falls, so text extraction that drops leading spaces moves every chord to the start of its line. Pasted text keeps the spaces, and the spec's `chords-above-lyrics.core.ts` converts it to ChordPro without any dependency.

**Measurement, this session.** One synthetic chord chart of 25 lines and 27 chord symbols, set in a monospaced font, was rendered by a browser to a PDF and to a 1333x1398 PNG, and the PNG was degraded into a fake photo (2.5 degree rotation, blur, noise, warm tint, JPEG). It is one sample, a best case compared with a real photo of a paper sheet, and it is reported as such.

| Extractor | Chord symbols recovered | Columns kept | Time (Node, this container) |
|---|---|---|---|
| `pdfjs-dist` 6.4.299 text layer, items placed by their x position | 27 of 27 | yes, every chord over its syllable | 91 ms |
| `tesseract.js` 7.0.0, `eng` best_int model, clean 1333 px image | 26 of 27 | mostly | 804 ms |
| same, fake photo | 17 of 27 | no: leading spaces lost, chords moved to the start of the line | 786 ms |
| same, clean image at 516 px wide | 4 of 27 | no | 456 ms |
| Amazon Textract `DetectDocumentText` | not measured: no call was made from this session | | |

**Sizes and licences**, read from the npm registry tarballs on 2026-10-27 (gzip -9 sizes in brackets, as served compressed):

| Package | Licence | What the browser downloads |
|---|---|---|
| `pdfjs-dist` 6.4.299 | Apache-2.0 | `pdf.min.mjs` 458,904 B (131,443 B) and `pdf.worker.min.mjs` 1,264,342 B (374,642 B) |
| `tesseract.js` 7.0.0 with `tesseract.js-core` 6.1.2 | Apache-2.0 | `tesseract-core-simd-lstm.wasm` 2,871,377 B (1,060,279 B), plus the language model |
| `@tesseract.js-data/eng` 1.0.0 | MIT (package field) | `eng.traineddata.gz` 2,952,873 B (best_int) or 10,923,060 B (default) |

`tesseract.js` loads its worker from `cdn.jsdelivr.net` by default (`src/worker/browser/defaultOptions.js`), so it would have to be configured to load the worker, core and model from pragma's own assets.

**Amazon Textract**, read this session: `DetectDocumentText` costs 1.50 USD per 1,000 pages in eu-west-3 up to one million pages a month (AWS Price List API, usage type `EUW3-SyncTextPagesProcessed`). Its synchronous call takes JPEG, PNG, PDF or TIFF up to 10 MB, and a PDF of one page only; multi-page PDFs go through the asynchronous API (Textract developer guide, *Set Quotas in Amazon Textract*). It does not list HEIC, the iPhone camera's default format.

## Decision

**Ship pasted text and PDF text extraction in slice 6; keep a photo as today's `image` chart, with no text extraction.** Pasted text goes through `chords-above-lyrics.core.ts`. A PDF chosen on the edit page is read in the browser by `pdfjs-dist`, loaded with a dynamic `import()` only when a PDF is picked: its text items are placed into lines by their y position and into columns by their x position, and the resulting text goes through the same converter, shown in the same preview under the text box. A PDF with no text layer (a scan) yields no text and is stored as a `pdf` chart, as today. A photo is stored as an `image` chart, as today. The PDF text layer recovered every chord in its column in the measurement and costs nothing on any screen but the chord editor, while photo OCR lost the columns on the one realistic sample and would add about 4 MB compressed of model and engine, or a new external service.

## Consequences

- `+` Most chord charts a member already has (exported or printed to PDF from a chord website) become transposable ChordPro without typing ChordPro syntax.
- `+` No new external service, no IAM permission, no per-page cost, and the file never leaves the phone to be read.
- `+` `pdfjs-dist` is downloaded only by a member who picks a PDF in the chord editor; the service worker caches it then (`sw.js` caches `/assets/` on first fetch), so no other screen pays for it.
- `-` A photo of a paper chord chart stays a picture: it cannot be transposed or highlighted, and the band types or pastes the chords if they want that. This is the D9 source the operator may expect most from a phone.
- `-` One new dependency of about 506 KB compressed on the edit page, Apache-2.0, with its worker file to wire into the Vite build, and one more package to upgrade; the PDF reconstruction logic (lines by y, columns by x) is ours to test and keep working on PDFs whose fonts are proportional rather than monospaced.
- `~` The photo path is revisited when a corpus of real photos from the band exists: the same measurement on ten of them, Textract against `tesseract.js`, decides between the two. Textract at 1.50 USD per 1,000 pages is not the obstacle; HEIC conversion and keeping columns are.

## Alternatives considered

### Option A — Paste and PDF text layer now, photo stored (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - 27 of 27 chords in their columns on the measured PDF.
  - No service, no cost, no new permission; the dependency loads on one screen only.
- **Costs:**
  - `pdfjs-dist`: 131,443 B plus a 374,642 B worker, compressed, on the chord editor.
  - Photos give no text.
- **Rationale:** It gives text from the two sources where columns survive, and spends nothing where the measurement says the result is not usable yet.

### Option B — Store the files, paste only (rejected)

- **Summary:** Spec option (a): no extraction from files at all. Paste goes through the converter; photo and PDF stay `image` and `pdf` charts.
- **Strengths:**
  - No new dependency.
  - The smallest slice 6.
- **Costs:**
  - A PDF exported from a chord website, which already carries exact text, stays a picture; the member copies its text by hand from a PDF viewer to get transposition.
- **Rejection rationale:** It loses on how much of D9 turns into usable chords, for a cost Option A keeps off every screen but one. It would win if adding a dependency at all were the constraint; the spec recommended it before this measurement existed.

### Option C — On-device OCR for photos as well (rejected)

- **Summary:** Option A plus `tesseract.js` in a web worker for photos, with its core and English model self-hosted.
- **Strengths:**
  - Photos give text without any external service; the image stays on the phone.
- **Costs:**
  - About 1,060,279 B (engine) plus 2,952,873 B (best_int model), compressed, on first use, and recognition time on a phone not measured.
  - On the fake photo, 17 of 27 chords and no columns, so the converter cannot place chords on syllables; the member corrects every line.
  - The upload accepts HEIC, and whether each member's browser can decode a HEIC photo into pixels for the OCR was not checked here.
- **Rejection rationale:** It loses on result quality, weighted highest: text that lost its columns is wrong in a way that looks right. Shifting weights does not fix it; better input (a real corpus showing columns survive) would.

### Option D — Amazon Textract from the API for photos and PDFs (rejected)

- **Summary:** The API sends the uploaded file from S3 to `DetectDocumentText` and returns lines with their bounding boxes, from which columns are rebuilt.
- **Strengths:**
  - Returns word geometry, so columns may survive better than with `tesseract.js`; supports rotation and lists `#` among detected characters.
  - Cheap: 1.50 USD per 1,000 pages in eu-west-3.
- **Costs:**
  - A new external service in the Lambda's path: a new IAM permission, a new adapter file (ADR-0012), a new failure mode and an alert.
  - Synchronous calls take one PDF page only; longer PDFs need the asynchronous API with polling or a notification.
  - No HEIC: the phone or the API converts first.
  - Quality on chord charts not measured.
- **Rejection rationale:** It loses on operational surface for an unmeasured gain, and its PDF path is worse than reading the text layer directly. It is the first candidate for photos once a corpus is measured.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Result quality, columns included | high | A chord on the wrong syllable is a wrong chart that looks right; the converter needs columns to place chords. |
| Share of D9 sources that become transposable text | high | D9 promised paste, photo and PDF; transposition and the member highlight only work on text. |
| Operational surface | medium | One developer; every external service adds a permission, an adapter, an alert and a failure mode. |
| Bytes and time on the phone | medium | Members use pragma on mobile data; a cost confined to the chord editor is acceptable, one on first load is not. |
| Privacy of the file | low | Chord charts are not personal data, but a file read on the phone never needs a data path to review. |

|  | A Paste + PDF text | B Paste only | C On-device OCR | D Textract |
|---|---|---|---|---|
| Result quality | ✓ 27 of 27 in columns on the PDF | ✓ paste is exact | ✗ 17 of 27, columns lost on the fake photo | ✗ not measured |
| Share of D9 transposable | ✓ paste and text PDFs | ✗ paste only | ✓ all three, if quality held | ✓ all three, if quality held |
| Operational surface | ✓ none | ✓ none | ✓ none | ✗ IAM, adapter, async API, alert |
| Bytes and time on the phone | ✓ about 506 KB compressed, chord editor only | ✓ none | ✗ about 4 MB compressed more | ✓ none on the phone |
| Privacy of the file | ✓ stays on the phone | ✓ | ✓ | ✗ sent to a service |

## Implementation pointers

- Spec: [`docs/features/pragma/ux-redesign/spec/spec.md`](../features/pragma/ux-redesign/spec/spec.md), *Chords by paste, photo or PDF*, question Q6, *Slices* (slice 6)
- Plan: `docs/features/pragma/ux-redesign/plan/plan.md` (to be written by `/technical-conception`)
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/domain/chords-above-lyrics.core.ts` (new, shared by paste and PDF), a new `pdf-text.adapter.ts` beside the chord editor in `apps/pragma/site/src/routes/catalog/` holding the only import of `pdfjs-dist`, `apps/pragma/package.json`, `apps/pragma/api/src/songs/songs.schema.ts` (chart kinds unchanged)
- Related ADRs: [ADR-0012](./0012-outbound-calls-live-in-adapter-files.md) (where an outbound call or third-party reader lives), [ADR-0045](./0045-pragma-design-system-is-notebook-with-grafts.md)
