---
date: 2026-08-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#52'
fix-pr: '#52'
fix-commits: [19d31bc]
eradication-level: 5
time-to-detect: hours
tags: [agent, tooling, scraping, delegation, pragma]
---

# I read six lines of a robots.txt and told thirteen agents the site was open

## Symptom

Two chord grids in the production catalogue turned out to have been read from
`boiteachansons.net`, a site whose `robots.txt` disallows `ClaudeBot`,
`Claude-Web`, `Claude-SearchBot` and `anthropic-ai` across the whole domain.
The grids had to be pulled back out and replaced.

The site was not read once by accident. It sat on a hand-written list of
"domains whose robots.txt permits this" that was handed to thirteen sub-agents
at once, each of which then fetched it.

## Root-cause chain

1. **Why were the grids read from a site that forbids it?**
   Because the domain was on the allow-list given to the sub-agents.

2. **Why was it on the allow-list?**
   Because its `robots.txt` was checked with
   `curl … | grep -iE "user-agent|disallow" | head -18`, and the first
   eighteen lines are a permissive `User-agent: *` stanza disallowing six
   admin paths.

3. **Why did eighteen lines look like enough?**
   Because a robots.txt was assumed to be a short file with one policy. This
   one is 206 lines: the wildcard stanza first, then forty-odd named-agent
   blocks, and `User-agent: ClaudeBot` / `Disallow: /` on lines 61 and 62.

4. **Why did one misread become thirteen requests?**
   Because the list was delegated before it was verified. A domain list handed
   to another agent is a claim made on its behalf, and sub-agents have no way
   to audit a premise they are given as fact — several of them did check
   domains they added themselves, and correctly refused `hooktheory.com` and
   `guitar-uke.com` on exactly this rule.

**Root cause:** thought *a robots.txt states one policy and the top of the file
is it*, actually *a file can welcome search engines in its first stanza and
refuse this agent by name forty lines below, so the answer is only in the whole
file*.

## Detection failure causes

- **Typing / linter:** inapplicable — the decision lived in a chat-time
  judgement, not in committed code.
- **Functional validation locally:** the fetches succeeded and returned chord
  pages, so nothing observable distinguished a permitted site from a forbidden
  one. A robots.txt is advisory: the server does not enforce it.
- **Code review:** the wrong claim was written into
  `docs/knowledge/free-chord-grid-sources.md` and reviewed as prose, where
  "these sites permit it" reads as a finding rather than as an assertion
  needing evidence.
- **Sub-agent verification:** the agents were told the list was pre-cleared, so
  the one check that would have caught it was explicitly waived for the entries
  that needed it most.

## Countermeasure

The two affected grids were replaced with this repository's own analysis of a
Deezer preview, and `docs/knowledge/free-chord-grid-sources.md` was corrected
in the same PR to name the three sites that block this agent.

- **Operator action:** none.

## Eradication

**Type:** knowledge (level 5 — the floor, and this entry argues it is also the
ceiling)

**Reference:** commit [`19d31bc`](https://github.com/hugoleborso/borso.fr/commit/19d31bc751733facf279137ad569e01fe766038d), in [PR #52](https://github.com/hugoleborso/borso.fr/pull/52)

**The fix:** [`docs/knowledge/free-chord-grid-sources.md`](../knowledge/free-chord-grid-sources.md)
names the three sites that block this agent and the seven that do not, states
the rule as *fetch `/robots.txt`, read it to the end, look for your own agent
by name*, and warns that a domain list handed to a sub-agent is a claim made on
its behalf. It shipped with the countermeasure rather than after it, so this
entry adds the causal analysis rather than a new artefact.

**Why the ladder stops at 5.** Two higher rungs were built and both were
removed before merge.

A level 2 came first: a script that read each `robots.txt` to the end, tracked
user-agent groups, and exited non-zero on a blocked domain. It worked, and it
was still the wrong shape. Deciding whether to fetch a page is not a coding
task — the domains live in a prompt and never enter the tree, so no hook can
invoke the check, no gate can depend on it, and nothing can notice it rotting.
A script only an agent's memory calls is the same act of remembering the rule
already asks for, with a file to maintain attached.

A rule in `CLAUDE.md` came second, and was removed for a related reason: it
restated, in the file every session loads, what a knowledge document already
said in the place a reader goes looking for it. The general instruction earns
its space only when it changes behaviour beyond the specific case, and *read
the whole file before trusting it* is a habit, not a repo convention.

So the honest test for the bottom of the ladder is whether a gate can reach the
input. When the input never enters the tree, levels 1 through 4 are not
available at any price, and reaching for them produces artefacts that resemble
eradications without doing their work. This entry and the knowledge document
are the whole countermeasure, and the residual risk is real: the next misread
is caught by attention, not by an exit code.

## Related

- [`docs/knowledge/free-chord-grid-sources.md`](../knowledge/free-chord-grid-sources.md)
  — the corrected list, and what each source actually covers.
- [`docs/knowledge/ultimate-guitar-scraping-cgu.md`](../knowledge/ultimate-guitar-scraping-cgu.md)
  — the entry whose conclusion was wrongly generalised to every other chord
  site in the first place.
- [`docs/dantotsus/lectured-without-reading-the-code.md`](./lectured-without-reading-the-code.md)
  — the same shape one layer down: asserting from a plausible narrative rather
  than from the artefact.
