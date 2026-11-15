---
date: 2026-11-15
introduced-at: conception
detected-at: review
severity: low
related-pr: '#350'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-docs-are-english.sh, .husky/pre-commit]
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

- The operator's repository received a French ADR and a commit crediting him for it.
  - The borso.fr session followed its first prompt, « Écris tout en français », over CLAUDE.md's English rule.
    - That prompt was written by a Talos session in `hugoleborso/talos`, through `create_session`, after it read `.claude/skills/construire-outil/BORSO-FR.md` (measured, `list_events` on `session_01K69KnD79rQbg7iQUupoHhQ`, 06:33 UTC).
      - The same prompt restated other borso.fr conventions wrongly: ADR « numérotation », and MADR format « si le dépôt n'a pas d'ADR ».
        - borso.fr's English rule lived only in prose, so it lost to the prompt the session read last.

## Root cause of occurrence

*Thought a session's first prompt comes from the operator and outranks the repository's rules, actually another session wrote it, and CLAUDE.md says English in specs whatever the request.*

CLAUDE.md, *Hard rules*: "English in identifiers, schemas, comments, commits
and specs. … Translate the operator's French or slang before it reaches code."
The seed prompt arrived wrapped as not typed by a person, and the session still
credited it to the operator.

## Detection failure causes

- **Pre-commit:** no gate read the language of a document. `scripts/check-adr-criteria.sh` and `scripts/check-numbered-sequences.sh` read an ADR's structure only, so the French ADR committed and pushed green.
- **Harness:** the Talos repository holds a second copy of how borso.fr writes, which nothing here can read or check. This sweep was refused access to it.

## Countermeasure

`scripts/check-docs-are-english.sh` refuses, at commit, an ADR, a spec or a
plan whose prose reads as French. It strips code, backticks, « guillemets »,
double-quoted strings, link targets and blockquotes, which is how English
documents here quote the French product strings, then counts French function
words. It refuses at 15 or more that make 40 or more per thousand words.

A file already on `main` is not held. Fourteen specs and plans written before
the rule are French, from 103 to 205 per thousand (measured on the tree
of `9b8d380ed`), and editing one should not trip the gate.

The second copy of the rules is removed where it lives, which needs a right
this session lacks:
[`docs/operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md`](../operator-backlog/talos-delegation-procedure-restates-borso-fr-rules.md).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
+# An ADR, a spec or a plan is written in English, whatever its session's prompt
+# asked. See docs/dantotsus/the-prompt-that-outranked-claude-md.md.
+run_check_on_files docs-are-english '^docs/(adr/|features/[^/]+/[^/]+/(spec|plan)/)' \
+  scripts/check-docs-are-english.sh
```

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
front-page redesign, already French on `main`. The commit
message has no gate. Commitlint checks its form, and the false credit was a
claim about who asked, which no script can verify.
