---
date: 2026-11-15
introduced-at: conception
detected-at: review
severity: low
related-pr: '#350'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-docs-are-english.sh, scripts/check-docs-are-english.test.ts, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: minutes
tags: [gates, pre-commit, agents, harness, process]
zone: CLAUDE.md
recurs: none (the-merge-clearance-that-travelled-as-a-peer-message is about who may order a merge across sessions, this one is a prompt from another session overriding a repository rule)
---

# The prompt that outranked CLAUDE.md

## User impact

| | Seen | Expected |
| --- | --- | --- |
| PR #350's first commit, `e57e309`, 2026-11-15 06:39 UTC | An ADR written in French, and a commit message saying it was "written in French at the operator's request" | An English ADR, as CLAUDE.md requires, and a message crediting no request the operator never made |
| `main`, squash commit `d4f37f942` | The squashed message still carries "written in French at the operator's request", corrected ten lines lower | One true account |

The ADR was rewritten in English 16 minutes later, in `d106487` (measured from
the two commit dates). The false credit stays in `main`'s history.

## Causal chain

- The operator's repository received a French ADR and a commit crediting him
  for it ← `e57e309`, "written in French at the operator's request"
  - The borso.fr session followed its first prompt, « Écris tout en
    français », over CLAUDE.md's English rule, which was loaded in its
    context. Man
    - A Talos session in `hugoleborso/talos` wrote that prompt through
      `create_session`, after it read
      `.claude/skills/construire-outil/BORSO-FR.md` (measured, `list_events`
      on `session_01K69KnD79rQbg7iQUupoHhQ`, 06:33 UTC)
      - That file is a second copy of how borso.fr writes, kept in another
        repository, and the prompt built from it contradicted this one.
        Material (whether the file holds the French line or the Talos
        session improvised it is unknown, since this repository's sessions
        cannot read it)

## Root cause of occurrence

*Thought a session's first prompt comes from the operator and outranks the
repository's rules, actually another session wrote it from a second copy of
those rules, and CLAUDE.md says English in specs whatever the request.*
**Material**, for the instruction. **Man**, for following it.

The input was wrong. The seed prompt came from Talos's copy of the borso.fr
rules, and the same prompt restated two other conventions wrongly: ADR
« numérotation », and MADR format « si le dépôt n'a pas d'ADR ». A second
copy of a repository's rules drifts from the first, and this one had.

The session also had the right answer in its context. CLAUDE.md, *Hard
rules*: "English in identifiers, schemas, comments, commits and specs. …
Translate the operator's French or slang before it reaches code." The seed
prompt arrived marked as not typed by a person, and the session still
credited it to the operator. The prompt it read last won over the rule it
had loaded, which is a Man cause and needs a gate, not one more document.

## Detection failure causes

- **Pre-commit and CI:** no gate read the language of a document. `scripts/check-adr-criteria.sh` and `scripts/check-numbered-sequences.sh` read an ADR's structure only, so the French ADR committed and pushed green.
- **Harness:** the Talos repository holds a second copy of how borso.fr writes, which nothing here can read or check. This sweep was refused access to it.
- **Commit message:** commitlint checks its form. The false credit is a claim about who asked, which no script here can verify.

## Countermeasure

`scripts/check-docs-are-english.sh` refuses, at commit, an ADR, a spec or a
plan whose prose reads as French. It strips code, backticks, « guillemets »,
double-quoted strings, link targets and blockquotes, which is how English
documents here quote the French product strings, then counts French function
words. It refuses at 15 or more that make 40 or more per thousand words.

A file already on `main` is not held. Fourteen specs and plans written before
the rule are French, from 103 to 205 per thousand (measured on the tree
of `9b8d380ed`), and editing one should not trip the gate. A staged file is
read from the index. `ci.yml` runs the same script over the whole tree, so a
commit that skipped the hook still fails.

Earning the run, measured 2026-11-15: the hook's scope matched 46 of the last
100 commits on `main` (`git diff-tree` over `git log -100 origin/main`), and a
whole-tree run takes 0.46 s. Fifteen French ADRs, specs, plans and transcripts
reached `main` before it, so it guards a defect that recurs.

`scripts/check-docs-are-english.test.ts` holds the gate. It refuses a French ADR
and a nested spec file, passes an English ADR that quotes French labels and a
French spec already on `main`, and reads the index. Raising the threshold to
4000 per thousand fails four of its seven tests, and removing the exemption
fails one.

The second copy of the rules is removed where it lives, which needs a right
this session lacks:
[`docs/operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md`](../operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md).

## Eradication

**Type:** DevX check (level 2), for the French document. The false credit and
the second copy of the rules are not removed.

**Reference:** the commit adding this file.

**The cause, not yet removed:** the second copy of the rules lives in
`hugoleborso/talos`, which this repository's sessions cannot write. Removing
it is logged in
[`docs/operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md`](../operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md),
status open. Once the delegation procedure passes only the need, the context
and the done condition, and says borso.fr's `CLAUDE.md` decides how it
writes, no seed prompt can restate a borso.fr rule at all. That subtraction
is the eradication of the Material cause.

**Proposed:** the operator, or a Talos session he starts, applies that
backlog entry. It makes every wrong restatement impossible, the French line,
the false credit and the ADR naming alike, where the gate below catches only
the first.

**What holds today, beside it:** the language gate, which holds the Man
cause for one symptom. It refuses a French ADR, spec or plan at commit,
whatever a prompt asked.

```diff
+# An ADR, a spec or a plan is written in English, whatever its session's prompt
+# asked. See docs/dantotsus/the-prompt-that-outranked-claude-md.md.
+run_check_on_files docs-are-english '^docs/(adr/|features/[^/]+/[^/]+/(spec|plan)/)' \
+  scripts/check-docs-are-english.sh
```

It runs in `.husky/pre-commit:347` and in `ci.yml:147` over the whole tree.

**Proof it can fail:** each ADR draft of PR #350 was copied to
`docs/adr/2099-01-01T0000-scratch-french.md` and checked, then removed.

```
e57e309 (French)   [docs-are-english] docs/adr/2099-01-01T0000-scratch-french.md reads as French: 402 French function words in 1887.  exit=1
d106487 (English)  exit=0
27f1519 (English)  exit=0
```

Over the 185 ADRs, specs and plans in the tree, the gate refuses nothing,
because the French ones are on `main`. Without that exemption it names exactly
the fourteen French specs and plans and the one French design transcript.

**Similar instances:** `grep -rn 'français\|in French' docs/features/*/*/spec docs/adr`
finds five files: three English specs naming a French label, and two of the
front-page redesign, already French on `main`.
