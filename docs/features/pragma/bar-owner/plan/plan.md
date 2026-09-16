# Plan — bar owner

| Layer | File | Change |
| --- | --- | --- |
| Migration | `api/src/database/migrations/0009_bar_owner.sql` | `ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "owner_member_id" uuid` — DSQL takes a bare `ADD COLUMN`, so the column is nullable with no default and no foreign key. |
| Schema | `api/src/bars/bars.schema.ts` | `ownerMemberId` on the table, and on `barCreateSchema` as a nullable uuid defaulting to null; the update schema derives from it. |
| Repository | `api/src/bars/bars.repository.ts` | Column in `PROJECTION`, `BarRow`, `BarPersistedShape` and the insert defaults. |
| Repository | `api/src/members/members.repository.ts` | `deleteMemberWithLinks` clears `owner_member_id` on the bars that member owned, inside the same transaction. |
| Service | `api/src/bars/bars.service.ts` | Carry `ownerMemberId` through create and patch. |
| Front core | `site/src/routes/bars/bar-form.core.ts` | `ownerMemberId` in the form values (empty string means no owner), the payload, the initial and the blank. |
| Front core | `site/src/routes/bars/bars-page.core.ts` | `ownerMemberId` on `BarRow` and on the kanban card, plus `selectOwnerName`. |
| Organism | `site/src/components/organisms/BarForm.tsx` | An owner `<select>` fed by the members list. |
| Organism | `BarsList.tsx`, `BarsKanban.tsx` | Owner column and owner line. |
| Queries | `site/src/lib/queries/bars.queries.ts` | `ownerMemberId: null` in the optimistic defaults. |
| i18n | `site/src/i18n/{en,fr}.json` | `bars.owner`, `bars.ownerNone`. |
| Vocabulary | `apps/pragma/VOCABULARY.md` | An `owner` bullet under Bar. |

Risks: the owner is a plain uuid with no foreign key, because DSQL's
`ADD COLUMN` accepts no constraint clause. A stale owner id is therefore
possible if a member disappears outside `deleteMemberWithLinks`; the front
end renders an unknown owner as no owner rather than throwing.

## Plan — outreach message

| Layer | File | Change |
| --- | --- | --- |
| Migration | `api/src/database/migrations/0010_member_contact_and_outreach_template.sql` | `phone` and `email` on `member`, and the one-row `outreach_template` table. |
| Slice | `api/src/outreach/` | `outreach.schema.ts`, `.repository.ts`, `.service.ts`, `.controller.ts` — `GET` and `PUT /api/outreach/template`, both behind the member session. |
| Members | `members.schema.ts`, `.repository.ts`, `.service.ts` | `phone` and `email` carried through the projection, the persisted shape and the patch. |
| Me | `me.service.ts`, `me.controller.ts` | `PUT /api/me/contact` lets the signed-in member save their own phone and email; `GET /api/me` returns them. |
| Front core | `site/src/routes/bars/outreach-message.core.ts` | `renderOutreachMessage` and `selectOutreachTemplate`, pure and fully covered. |
| Adapter | `site/src/lib/clipboard.adapter.ts` | The one call to `navigator.clipboard`, answering whether the write happened. |
| Queries | `site/src/lib/queries/outreach.queries.ts`, `me.queries.ts` | The template read and write, and the contact-details write. |
| Organisms | `OutreachTemplateCard.tsx`, `ContactDetailsForm.tsx`, `BarForm.tsx` | The template editor on the bars page, the contact fields on the account page, the copy button on the bar form. |
| i18n | `site/src/i18n/{en,fr}.json` | The default template and every label around it. |

Risks: the default template lives in the translation catalogues rather than
in the database, so an empty `outreach_template` table is not a missing
value but the intended starting point; switching language before saving
switches the default too.

## Plan — adding a bar from the map

| Layer | File | Change |
| --- | --- | --- |
| Core | `api/src/bars/bar-search.core.ts` | Parses the Nominatim body with Zod into `BarSearchHit`, walking the city keys OpenStreetMap uses and the two phone tags. 100% coverage. |
| Adapter | `api/src/bars/bar-search.adapter.ts` | The one outbound call, per ADR-0012, carrying the usage policy in code: one request per second, an hour of caching, and an identifying User-Agent. |
| Controller | `api/src/bars/bars.controller.ts` | `GET /api/bars/search?query=`, behind the member session. |
| Query | `site/src/lib/queries/bars.queries.ts` | `useBarPlaceSearch`, disabled on an empty query. |
| Organism | `site/src/components/organisms/BarPlaceSearch.tsx` | The search box, 600 ms debounce, the OpenStreetMap attribution link, one sentence when the service does not answer. |
| Front core | `site/src/routes/bars/bar-form.core.ts` | `buildBarFormFromPlace`, which always prepares a new bar. |
| i18n | `site/src/i18n/{en,fr}.json` | The search labels. |
| ADR | `docs/adr/0018-…md` | Why Nominatim rather than Google, and what its usage policy costs. |

Risks: Nominatim is run for openstreetmap.org and serves everyone else on
spare capacity, so a slow or refused answer is normal rather than an
incident. Its data is thinner than a commercial vendor's — a phone number
exists only where a contributor tagged it. The attribution line is a
policy requirement no gate here can check.

## Plan — qualifying a bar

| Layer | File | Change |
| --- | --- | --- |
| Migration | `api/src/database/migrations/0011_bar_concert_mood_and_support.sql` | `concert_mood` and `available_support` on `bar`, both nullable; the support list is JSON in a TEXT column, the shape a lineup already uses, because DSQL has no array type to add here. |
| Core | `api/src/bars/bar-support.core.ts` | The canonical ordering of the support list and the mood resolution. The JSON decoding stays in the repository, per the `repository-json-column` blueprint: a fallback in a pure module is a branch no test can distinguish, since an unreadable column and an empty one give the same answer. |
| Schema | `api/src/bars/bars.schema.ts` | The two columns and their Zod input, the support defaulting to the empty list. |
| Repository | `api/src/bars/bars.repository.ts` | Serialises the support on write, parses it on read, so no other file sees the JSON. |
| Front core | `site/src/routes/bars/bar-form.core.ts` | The two lists, their translation keys, `toggleSupport` and `parseConcertMood`. |
| Front core | `site/src/routes/bars/bars-page.core.ts` | `addMoodLabelToCards`, which keeps the translation in the page and the projection pure. |
| Molecule | `site/src/components/molecules/BarQualificationFields.tsx` | The mood select and the support checkboxes, extracted so `BarForm` stays under the line limit. |
| Organisms | `BarsList.tsx`, `BarsKanban.tsx` | The mood column and the mood on the card. |
| i18n | `site/src/i18n/{en,fr}.json` | The mood and support labels. |

Risks: the support list is a closed set in code, so a fourth kind of help
is a migration-free code change but still a deploy. The JSON column cannot
be queried by support without a scan, which is fine at this size and would
not be at a thousand bars.
