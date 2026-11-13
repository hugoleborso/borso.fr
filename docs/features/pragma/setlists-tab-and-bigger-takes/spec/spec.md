# Setlists get their own tab, and a take goes up to 200 MiB

## Perspectives confronted

- [x] **Client / business**: a member asked in the band's chat on 2026-11-13 for setlists in the app's bar, because they go almost only there, and for a higher limit after a WAV take of Uprising was refused at 50 MiB. The operator asked to take both.
- [x] **Product**: the cap moves from 50 MiB to 200 MiB, a value picked in this session (about 10 minutes of 24-bit 48 kHz stereo WAV, inferred from the format's bit rate). The operator can change it on the pull request.
- [x] **Tech-lead**: the upload is one presigned PUT straight to S3, which accepts a single PUT far above 200 MiB, and the presign binds Content-Length, so S3 still refuses a larger body. No Lambda or API Gateway sits in the byte path.
- [x] **Developer**: the domain constant, the sign schema, the form message and their tests read one constant, so the change is that constant plus its tests.
- [x] **Designer**: five tabs fit at 375 px (75 px each, measured with Playwright). The Sessions/Setlists toggle on both pages goes away, since the tab does its job.

## Why

Members reach setlists in one tap, and a take recorded as WAV for one song uploads.

## Behaviour

- The bottom bar on a phone and the sidebar on desktop list Home, Sessions, Setlists, Songs, Band, in that order.
- Any path at or below `/setlists` lights the Setlists tab. `/sessions` and below light Sessions.
- The Setlists page is titled "Setlists" and shows no Sessions/Setlists toggle. The Sessions page shows no toggle either.
- An audio file up to exactly 200 MiB is accepted by the form and by `POST /api/takes/sign`. One byte more is refused before upload, with "200" named in the message, and the API answers 400.
- `nav.setlists` reads "Setlists" in English and French.

## Out of scope

- Splitting or compressing a large file in the browser.
- Any change to retention: every take is still kept until deleted.
