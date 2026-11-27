---
date: 2026-05-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#24'
fix-commits: [9199b11e70]
eradication-level: 5
eradication-paths: [CLAUDE.md]
time-to-detect: minutes
tags: [harness, skill, conception, code-quality, claude-md]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [believed-the-bundle-readme-not-the-live-package-json]
---

# Four turns on CloudFront, citing a line nobody had opened

## User impact

The operator asked one debugging question and read four turns of narrative
before the agent looked at the code. He had to pull it back twice.

| | Seen | Expected |
| --- | --- | --- |
| "Is the JPEG-on-404 mapping in `StaticSite` why `/r/<slug>` does not load the SPA?" | Four turns on CloudFront `errorResponses`, S3 `NoSuchKey`, OAC `ListBucket` and content-type rewriting, citing `infra/cdk/src/internal/static-site.ts:166` | One Read of the construct, then a one-line answer |
| The cited location | Wrong folder (`internal/`) and wrong line (166) | `infra/cdk/src/constructs/static-site.ts`, line 173 |
| The status CloudFront returns | The agent confirmed the operator's guess of 200 | 404 with the JPEG body, read from the file afterwards |

The operator's pull-backs, from the session (quoted in the first version of
this entry): *« Donc en fait le problème, que tu aurais pu décrire en une
ligne, c'est que le code renvoyé par cloud front à la place d'une 404 est 200
quand on sert cette image. »* then *« Est-ce que c'est ça ? »*

## Causal chain

- The operator read four turns of CloudFront narrative, one of them wrong about
  the status code.
  - The agent answered from its model of CloudFront, S3 and OAC, without a Read
    of the construct.
    - It cited a location to back the narrative, which it had not opened:

      ```text
      infra/cdk/src/internal/static-site.ts:166   ← ❌ folder and line invented to fit the claim
      ```

      - The rule that held the right answer was in its context. CLAUDE.md at
        `9199b11e70^` said "Verify before asserting. When a claim depends on
        the state of the repo or live AWS, check it. … Don't restate from
        memory". The prior that CloudFront behaviour is general knowledge won
        over it (Man).

## Root cause of occurrence

*Thought "how CloudFront maps a 404 is general knowledge, so I can describe it
without the file", actually the question was about this repository's
`StaticSite` construct, whose error mapping only the file states.* (Man)

The agent wrote the line, and the right rule was loaded. CLAUDE.md at the
parent of the fix commit (`git show 9199b11e70^:CLAUDE.md`, line 20) already
said "Don't restate from memory", then "paste the relevant source". Under the
standard's agentic 4M rule, a loaded rule that the prior overrode is Man. One
more sentence in CLAUDE.md cannot remove a Man cause.

## Detection failure causes

- **Harness:** nothing compares a turn's text with the tool calls of the
  session. A turn can cite `<path>:<line>` with no Read or Grep of that path,
  and it reaches the operator.
- **Self-review:** the agent's check was whether the narrative cohered. A
  coherent narrative and a read file look the same from inside the turn.
- **Linter and types:** not applicable. The false claim lived in chat, not in
  code.

## Countermeasure

The agent read `infra/cdk/src/constructs/static-site.ts`, corrected the path
and the line in the chat, and corrected the status code from the file.

## Eradication

**Type:** knowledge (level 5). What holds today is one sentence in CLAUDE.md.

**Reference:** commit [`9199b11e70`](https://github.com/hugoleborso/borso.fr/commit/9199b11e70)
rewrote the CLAUDE.md rule to bind a claim about a file to a Read this
session. CLAUDE.md now says: "**Verify before asserting.** Read the file, run
the command or call `aws ... get-...` this session before you describe it."

The rule existed in another wording before the defect, so it is the weakest
rung and does not hold against a Man cause.

**Proposed:** a Stop check beside `scripts/hooks/checks/screens-shown.core.ts`,
run by the existing `Stop` hook in `.claude/settings.json`
(`scripts/hooks/hook.ts`). `screens-shown` already reads `transcript_path` to
refuse a turn that claims a visual comparison without a showing tool call. The
new check would read the last assistant text, extract each repository path it
cites as `<path>` or `<path>:<line>`, and refuse the turn when no Read, Grep or
Bash call of the session touched that path. A cited file nobody opened could
then no longer reach the operator. The first version of this entry rejected a
hook because "hooks don't see agent chat output". `screens-shown` shows that
belief is false.

**Proof it can fail:** not tried. The proposal is not built.

**Similar instances:** `grep -ril 'before checking\|without checking\|believed' docs/dantotsus/`
finds the same family on other surfaces:
[`described-screenshot-without-checking-pixels.md`](./described-screenshot-without-checking-pixels.md),
[`believed-the-bundle-readme-not-the-live-package-json.md`](./believed-the-bundle-readme-not-the-live-package-json.md)
and [`built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md).
The first version of this entry counted a second instance, the knowledge entry
claiming the GitHub MCP server strips `<details>`. It is dropped.
`docs/knowledge/github-mcp-pr-body-sanitizer.md` now records, observed
2026-08-15 on PR #49, that `<details>` and `<summary>` are stripped. That
claim was not a prior passed off as fact.
