# ADR-2026-11-26T0937: Deduplicate concert registrations with validator and mailchecker

- **Status:** proposed
- **Date:** 2026-11-26
- **Deciders:** hugoleborso
- **Tags:** concert-registration, data, pragma

## Context

pragma.borso.fr becomes a public page where anyone signs up for a concert with a first name and an email. For the 17 December 2026 concert at Punk Paradise, the band draws three free beers among the registrants. A prize invites one person to sign up several times. One email per concert stops only the laziest attempt, because `Jean.Dupont+bieres@gmail.com`, `jeandupont@gmail.com` and `jeandupont@googlemail.com` reach one mailbox. A throwaway mailbox (yopmail, 10minutemail) costs nothing to create. The page goes live the evening it is written, so the rule must already exist and be tested. It touches only `apps/pragma`.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A fan using an alias or a throwaway address is refused at sign-up instead of entering the draw twice | `concert-registrations.controller.test.ts` alias and `x@yopmail.com` cases |
| Provider rules stay correct without us | operator | high | The operator asked for maintained libraries over rules we keep up by hand | Which package owns the per-provider rules and the disposable list |
| Size of the change tonight | author | medium | The communication goes out the same evening | Files and dependencies added |

## Decision

**`validator` for the canonical email, `mailchecker` for throwaway mailboxes.** `canonicalizeEmail` trims and lower-cases the address and calls `validator`'s `normalizeEmail` with its defaults. Those defaults remove the dots and the `+tag` on Gmail, fold googlemail.com onto gmail.com, and drop the subaddress on Outlook, Yahoo and iCloud. A `+tag` left on any other domain is then dropped, unless that would empty the local part. Registrations are unique on `(session_id, canonical_email)`. `MailChecker.isValid` refuses a disposable mailbox with 422 `disposable-email`. Both packages own the rules that change over time, so we do not maintain them.

## Consequences

- `+` An alias of one mailbox is refused with 409 `already-registered` on the same concert.
- `+` A known throwaway domain is refused before any row is written.
- `-` Three new packages in `apps/pragma` (`validator`, `@types/validator`, `mailchecker`). The disposable list is only as fresh as the installed `mailchecker` version, so it ages until someone bumps it.
- `-` A person with several real mailboxes still enters several times. No email rule stops that. The draw itself does, by picking among people present that night.
- `~` `concert_registration` keeps both `email`, used to contact the person, and `canonical_email`, used only for the uniqueness check.

## Alternatives considered

### Option A — validator plus mailchecker (chosen)

- **Raised by:** operator
- **Summary:** Two maintained libraries, wrapped in `domain/registration-email.core.ts` so tests stay pure.
- **Strengths:**
  - The per-provider alias rules and the disposable list live upstream.
  - One thin wrapper, tested at 100% with every mutant killed.
- **Costs:**
  - Three dependencies, one of which ships a domain list that must be bumped.
- **Rationale:** It wins on both high-weight criteria.

### Option B — Hand-written canonicalizer, no dependency (rejected)

- **Raised by:** author
- **Summary:** Lower-case the address, strip `+tag` everywhere and the dots on Gmail, in about fifteen lines.
- **Strengths:** No dependency.
- **Costs:** It reimplements provider rules `validator` already maintains, and it has no disposable check.
- **Rejection rationale:** It loses on "provider rules stay correct without us".
- **Operator's answer:** "Pourquoi sans ajouter de lib alors que je te l'ai demandé ?" The operator wanted libraries.

### Option C — Raw `disposable-email-domains` list (rejected)

- **Raised by:** author
- **Summary:** Import a bare list of domains and write the lookup ourselves.
- **Strengths:** A list updated more often (published 22 November 2026, according to npm).
- **Costs:** We would write and test the lookup ourselves. Subdomains are left to our own code.
- **Rejection rationale:** `mailchecker` bundles the list with its check (last published July 2026, according to npm). The difference in freshness does not outweigh writing our own lookup tonight.

## Scores

|             | Option A | Option B | Option C |
|---|---|---|---|
| Does it change the app for its users | ✓ refuses aliases and throwaway mailboxes | ✗ refuses aliases only | ✓ refuses throwaway mailboxes, needs B or A for aliases |
| Provider rules stay correct without us | ✓ both rule sets live upstream | ✗ rules kept by hand | ✓ list upstream, lookup by hand |
| Size of the change tonight | ✓ one wrapper | ✓ one function | ✗ wrapper plus our own lookup |

## Implementation pointers

- Spec: none, the scope was set in the session that wrote this record.
- Plan: none.
- Commit: stamped by /after-task-kaizen on merge.
- Files: `apps/pragma/domain/registration-email.core.ts`, `apps/pragma/api/src/concert-registrations/concert-registrations.service.ts`, `apps/pragma/api/src/database/migrations/0034_concert_registration.sql`
- Related ADRs: none.
