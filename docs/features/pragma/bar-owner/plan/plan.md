# Plan — bar owner

| Layer | File | Change |
| --- | --- | --- |
| Migration | `api/src/database/migrations/0006_bar_owner.sql` | `ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "owner_member_id" uuid` — DSQL takes a bare `ADD COLUMN`, so the column is nullable with no default and no foreign key. |
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
| Migration | `api/src/database/migrations/0007_member_contact_and_outreach_template.sql` | `phone` and `email` on `member`, and the one-row `outreach_template` table. |
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

## Plan — adding a bar from Google Maps

| Layer | File | Change |
| --- | --- | --- |
| Core | `api/src/bars/bar-search.core.ts` | Parses the Places body with Zod into `BarSearchHit`, reading the city from the address components with a `postal_town` fallback. 100% coverage. |
| Adapter | `api/src/bars/bar-search.adapter.ts` | The one outbound call, per ADR-0012. Reads `GOOGLE_PLACES_API_KEY` at call time and answers `not-configured` rather than throwing when it is unset. |
| Controller | `api/src/bars/bars.controller.ts` | `GET /api/bars/search?query=`, behind the member session; `not-configured` becomes a 503. |
| CDK | `cdk/lib/stack.ts` | Passes the key to the API Lambda only when the deploy environment supplies one, with a stack test asserting both halves. |
| Query | `site/src/lib/queries/bars.queries.ts` | `useBarPlaceSearch`, disabled on an empty query. |
| Organism | `site/src/components/organisms/BarPlaceSearch.tsx` | The search box, 600 ms debounce, one sentence when the deployment has no key. |
| Front core | `site/src/routes/bars/bar-form.core.ts` | `buildBarFormFromPlace`, which always prepares a new bar. |
| i18n | `site/src/i18n/{en,fr}.json` | The search labels. |
| ADR | `docs/adr/0017-…md` | Why the call is proxied and where the key lives. |

Risks: the key lands in the Lambda's configuration in plaintext, so the
restriction that bounds spend is the one set on the key in the Google
console. The search is debounced in the page, not rate-limited on the
server, because Google charges rather than throttles.
