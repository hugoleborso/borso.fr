---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#101'
fix-commits: none (the eradication is a proposed gate in check-adr-criteria.sh, waiting for the operator's choice)
eradication-level: 5
eradication-paths: [scripts/check-adr-criteria.sh]
time-to-detect: days
tags: [adr, process, secrets, pragma]
zone: .claude/skills/adr
---

# An ADR that never listed doing nothing

## User impact

Hours after the pull request merged, the operator asked the question the ADR
should have answered, in French: *"before merge: I did not do it, but you want
me to store a secret, then?"*

| | Seen | Expected |
| --- | --- | --- |
| The pull request's *Before merge* section | How to store a Spotify credential, read as a prerequisite | Whether to store it, with what the app does without it |

The feature works without the secret. Deezer links are already exact, and a
song with no Spotify id falls back to a Spotify search link
(`SPOTIFY_SEARCH_ORIGIN = 'https://open.spotify.com/search'` in
`apps/pragma/site/src/lib/listen-links.utils.ts`). The credential buys one
thing: the Spotify link lands on the track instead of a search page. The
operator, the only person asked to hold the credential, never saw that trade
before merging. Band members saw no difference.

## Causal chain

- The operator had to ask whether the secret was needed, after the merge.
  - The *Before merge* section said how to store the secret, because the ADR
    had chosen where it lives.
    - [ADR-2026-09-15T2023](../adr/2026-09-15T2023-spotify-track-ids-resolved-by-isrc-at-link-time.md)
      scored five options, A to E. All five answer *where does the Spotify
      credential live and when is the lookup made*:

      ```markdown
      ### Option A — Resolve once by ISRC at link time, credential in SSM (chosen)
      ### Option B — Resolve on every song search, alongside Deezer (rejected)
      ### Option C — Resolve on demand when the dialog opens (rejected)
      ### Option D — Credential as a Lambda environment variable from a CI secret (rejected)
      ### Option E — Credential in the application database, as ADR-2026-05-19T1955 chose (rejected)
      <!-- ❌ no option without Spotify -->
      ```

      - The operator's request said, in French, *"add a link to Spotify and
        Deezer"*. The agent took Spotify as given and opened the ADR one level
        below the real decision (Material).

## Root cause of occurrence

*The agent thought a request phrased as a feature fixes the option set to the
ways of building it, actually the request did not authorise every cost the
feature turned out to carry, and a cost that lands on the operator, a
credential to hold and rotate, is one he must be offered to decline.*
(Material)

The operator's request is the agent's Material. It named Spotify, so Spotify
framed the option set. The `/adr` skill then in force prompted for *"The "no"
option (do nothing / postpone / pick a smaller scope)"*, but only in Round 3 of
the interactive walk (`git show c718c65ed3:.claude/skills/adr/SKILL.md`, line
59). The piloted mode's input list asked for alternatives with no such
prompt. Which mode wrote this ADR is not recorded (inferred: no walk, since the
operator named no criteria in it).

## Detection failure causes

- **Linter:** an ADR is prose, and no rule read its option set.
- **ADR standard:** it asked for "minimum two alternatives". Five well-scored
  options satisfied that, and nothing asked whether the problem statement was
  the one worth deciding.
- **Review:** the standards review read source against `docs/standards/`, not
  an ADR against its own rubric. The technical validation took a spec as its
  argument, and there was none here.
- **Operator validation:** the pull request body carried the instruction and
  not the choice, so reading it closely still would not surface the
  alternative.

## Countermeasure

Commit `c718c65` shipped the integration, and nothing in it is wrong. The
correction was to the record and to the operator's options: leave it unseeded,
seed it, or remove the Spotify path. The merged state works unseeded.

## Eradication

**Type:** none holds (level 5). The eradication is proposed below and waits
for the operator's choice.

**What was tried, and does not hold:** commit `320f1cdca` (the kaizen of PR
#101) added a prose rule to `.claude/skills/adr/standard.md`, line 70 today:

```diff
+**One of the options is always not doing the thing.** Write it as a real
+option with a real rationale, never as a sentence saying it was obviously
+rejected: what the product still does without the change, and what it costs to
+keep living that way.
```

It is not an eradication. Of the 28 ADRs from `2026-11-03T1438` on, 16 contain
none of the phrases "do nothing", "not doing", "nothing changes", "keep it",
"keep the current" or "status quo" (measured with `grep -ciE` on each file).
The newest, `docs/adr/2026-11-27T1426-qr-code-library-for-visitor-qr.md`,
lists options A to D, four ways to draw a QR code and none without one. A
stronger mechanism is possible, so the prose alone does not pass.

**Proposed (the eradication):** extend `scripts/check-adr-criteria.sh`, which
already refuses an ADR by its section shape from the id `2026-11-03T1438` on
(`FIRST_CHECKED_ID`). From a new cut-off id, it would also refuse an ADR whose
`## Alternatives considered` has no `### Option` heading containing "Do
nothing". The omission could then no longer pass at commit (level 2), and only
the quality of that option is left to review. An ADR whose do-nothing option
truly does not exist, such as sign-in for a band that cannot work without it,
writes the heading with that reason in one line. It is not built here, because
this rewrite changes no code outside `docs/dantotsus/`.

**Proof it can fail:** none today, since no gate holds the rule.

**Similar instances:** [ADR-2026-09-14T1903](../adr/2026-09-14T1903-per-member-credentials-replace-the-shared-password.md)
and [ADR-2026-05-19T1955](../adr/2026-05-19T1955-pragma-shared-password-auth.md)
are the two other credential-storage ADRs. Both keep a credential the product
cannot work without, so the do-nothing option does not exist there. The 16
recent ADRs found above are the live instances.
