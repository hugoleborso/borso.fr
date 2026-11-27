---
date: 2026-08-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#52'
fix-commits: [19d31bc751]
eradication-level: 5
eradication-paths: [docs/knowledge/free-chord-grid-sources.md]
time-to-detect: hours
tags: [agent, tooling, scraping, delegation, pragma]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [said-the-file-was-unreachable-without-looking]
---

# I read six lines of a robots.txt and told thirteen agents the site was open

## User impact

Two chord grids in the production Pragma catalogue had been read from
`boiteachansons.net`. That site's `robots.txt` disallows `ClaudeBot`,
`Claude-Web`, `Claude-SearchBot` and `anthropic-ai` on the whole domain.
The grids had to be pulled out and replaced.

| | Seen | Expected |
| --- | --- | --- |
| Allow-list handed to sub-agents | `boiteachansons.net` listed as a site whose song pages are open to every agent | the site listed among those that block this agent |
| Catalogue | two grids sourced from that site | no grid from a site that refuses this agent |

Thirteen sub-agents received the list at once (reported in PR #52).

## Causal chain

- Two catalogue grids came from a site that forbids this agent.
  - Sub-agents fetched the site because it was on the domain list in their brief, given as already cleared.
    - The list came from `docs/knowledge/free-chord-grid-sources.md`, which commit 349c5a028 wrote: "Checked directly, `boiteachansons.net`, `tabs4acoustic.com`, `cifraclub.com.br`, … disallow only admin, cache and print paths."
      - The agent had checked the domain with `curl … | grep -iE "user-agent|disallow" | head -18`. The eighteen lines printed are a permissive `User-agent: *` stanza that disallows six admin paths.
        - The file is 206 lines long. `User-agent: ClaudeBot` and `Disallow: /` sit on lines 61 and 62, below the cut.
        - The same commit 349c5a028 records the trap for two other sites: hooktheory.com and guitar-uke.com "carry an explicit Disallow for ClaudeBot below a permissive wildcard block, so reading only the first stanza of a robots.txt gives the wrong answer." The rule was in the agent's context when it listed boiteachansons as open.
  - Several sub-agents checked the domains they added themselves and refused `hooktheory.com` and `guitar-uke.com` on this rule. They did not recheck the domains they were handed.

## Root cause of occurrence

*Thought the eighteen lines `head -18` printed were the site's policy,
actually the pipeline cut the file before the named-agent blocks, where a
robots.txt states its refusal of a specific agent.*

Tag: **Man** (agentic rule). The right answer was in the agent's context.
It wrote the "read below the wildcard stanza" rule for two other sites in
the same commit, and still trusted a truncated read for a third. One
document more cannot fix that, since the document was already there.

## Detection failure causes

- **Tool call:** no hook runs on `curl` or `WebFetch` against a site's `robots.txt`. The `PreToolUse` matcher in `.claude/settings.json` covers `Bash` but not `WebFetch`, and no check reads robots rules.
- **Local run:** the fetches returned chord pages. A robots.txt is advisory and the server does not enforce it, so nothing distinguished a permitted site from a forbidden one.
- **Review:** the wrong claim sat in a knowledge file and was reviewed as prose. "These sites permit it" read as a finding, not as a claim needing evidence.
- **Sub-agent verification:** the brief told the sub-agents the list was cleared, so the check that caught two sites was skipped for the one that needed it.

## Countermeasure

The two grids were replaced with this repository's own analysis of a
Deezer preview. Commit 19d31bc751 corrected
`docs/knowledge/free-chord-grid-sources.md` to name the three sites that
block this agent and to state the rule: fetch `/robots.txt`, read it to
the end, and look for your own agent by name.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`19d31bc`](https://github.com/hugoleborso/borso.fr/commit/19d31bc751733facf279137ad569e01fe766038d), in PR #52.

What holds today is the corrected knowledge file. It does not hold the
class. Its `triggers:` fire on `apps/pragma/scripts/**` and on commands
naming Ultimate Guitar or the open corpora, not on a fetch of a
`robots.txt`. And the cause is Man: the rule was in context and lost.

The original entry argued that no gate can reach the input, because the
domains live in a prompt. That premise is false. Every fetch is a tool
call, and the hook in `scripts/hooks/hook.ts` already sees every `Bash`
call.

**Proposed:** a `PreToolUse` check under `scripts/hooks/checks/`, for
`WebFetch` (added to the matcher in `.claude/settings.json`) and for
`curl` in `Bash`. It would fetch the target domain's `robots.txt`, parse
every user-agent group, and refuse the call when `ClaudeBot`,
`Claude-User` or `anthropic-ai` is disallowed for the path. No session or
sub-agent could then fetch a page that forbids this agent, whatever list
it was handed. The domain list in the knowledge file becomes a second copy
of what each `robots.txt` says, and could be deleted.

**Similar instances:** `grep -rln robots scripts .claude docs/knowledge`
finds only the knowledge file, so no other list of cleared domains exists.
[`lectured-without-reading-the-code`](./lectured-without-reading-the-code.md)
has the same shape one layer down: asserting from a partial read rather
than the whole artefact.
