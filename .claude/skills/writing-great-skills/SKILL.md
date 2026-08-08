---
name: writing-great-skills
description: >-
  Write, review, or improve a skill under `.claude/skills/`. Use when the user
  says "/writing-great-skills", "write a skill for X", "turn this into a skill",
  "review this skill", "my skill isn't triggering", or when a repeated manual
  correction should become a reusable instruction instead. Covers the folder
  layout, the frontmatter description that decides whether the skill triggers at
  all, how much freedom to give the agent, progressive disclosure across files,
  and the review checklist. This repository keeps skills markdown only, with no
  package.json and no test runner, so the skill also covers how to describe a
  procedure in prose that the agent runtime executes.
---

# Writing great skills

A skill is a set of instructions an agent reads when a matching task comes up.
The instructions live in `SKILL.md`, and longer material lives in sibling files
that the agent reads only when it needs them.

Two failures account for almost every skill that does not work. The first is a
description that does not match how people actually ask for the task, so the
agent never loads the skill. The second is a skill that repeats what the agent
already knows, so the instructions cost context and change nothing. Fix both
before worrying about anything else.

Anthropic's published guidance is in
[`references/anthropic-skill-authoring-best-practices.md`](./references/anthropic-skill-authoring-best-practices.md).
Read it when you want the full treatment. The present file is the short version
plus the rules that are specific to this repository.

## Rules that are specific to this repository

Skills here are markdown only. A skill folder holds `SKILL.md` and optional
`standard.md`, `template.md`, `worked-example.md`, and `references/`. A skill
folder does not hold a `package.json`, a test runner, or TypeScript helpers,
because a skill is instructions and not a program. When a skill needs a
procedure such as parsing a verdict, budgeting retries, or aggregating a
journal, describe the procedure in prose and let the agent runtime carry it
out. A `scripts/` folder holding a small shell helper is allowed when the work
is genuinely shell work, and `.claude/skills/dantotsu/scripts/list.sh` is the
existing example.

Write every skill in the plain style defined by
[`.claude/skills/plain-writing/SKILL.md`](../plain-writing/SKILL.md).

Name the skill after the task, in lowercase with hyphens, using a gerund or a
noun phrase that a person would type. Existing names in this repository are
`specification`, `technical-conception`, `implementation`,
`technical-validation`, `visual-validation`, `open-pr`, `adr`, `dantotsu`, and
`after-task-dantotsus`.

## Write the description first

The description is the only part of a skill that the agent sees before it
decides whether to read the rest, so the description does all the triggering
work. Write it before you write the body.

A good description states what the skill does and when to use it, and it
includes the words a person would actually say. Include the slash command form,
because people type it. Include the plain phrasings too, because people use
those more often.

Good, from the `adr` skill in this repository:

```
description: Write an Architecture Decision Record under `docs/adr/NNNN-<slug>.md`.
  Use when the user says "/adr", "I need to decide between X and Y", "help me
  pick", "draft an ADR", "record this choice"...
```

Bad, because nothing in it matches how anyone asks:

```
description: Helps with architectural documentation workflows.
```

State when not to use the skill when the boundary is unclear. The
`specification` skill says to skip it for trivial bug fixes and isolated
refactors, and the sentence stops the skill from firing on every small request.

## Give the right amount of freedom

Match how much you constrain the agent to how much the task tolerates variation.

Give a low amount of freedom when one wrong step breaks something, e.g., a
deploy sequence or a migration cutover. Write the exact commands in the exact
order, and say what to check after each one.

Give a medium amount of freedom when the shape is fixed but the content varies,
e.g., writing an architecture decision record. Give a template and a checklist,
and let the agent fill them in.

Give a high amount of freedom when the task is genuinely open, e.g., fixing a
defect. Give the principles and the gates, and let the agent choose the route.

Most skills that fail in practice are over constrained. The agent already knows
how to write a React component, so a skill that explains React spends context
and adds nothing. Only write down what the agent cannot infer, which is your
conventions, your file layout, your gates, and your traps.

## Use progressive disclosure across files

Keep `SKILL.md` short enough to read in full, which in practice means under
about 500 lines. Move the long material into sibling files, and name each file
in `SKILL.md` with one sentence about when to open it.

The pattern this repository already uses is a `SKILL.md` that holds the
procedure and a `standard.md` that holds the reasoning behind it. The
`dantotsu` skill says to read `standard.md` before facilitating one, because
the checklist alone loses the intent.

Keep the reference tree one level deep. A file that tells the agent to read
another file that tells it to read a third file wastes turns, and the agent
often stops before the end.

## Structure of the body

Open with one paragraph saying what the skill produces. A reader should know
the output after two sentences.

Then say when to use the skill and when not to, unless the description already
covers it fully.

Then give the procedure as numbered steps, with the exact file paths and the
exact commands. Name the artefact each step produces.

Then give the checks. A skill that produces something should say how to tell
whether the something is right, and it should say what to do when a check
fails.

Include one worked example when the output has a shape that is hard to describe
in the abstract. The `specification` skill keeps its example in
`worked-example.md` so the example does not crowd the procedure.

## Do not write anything that goes stale

Do not name a model version, a date, a person, or a pull request number in a
skill, because all four go stale and nobody updates them. Point at the file or
the index that holds the current value instead.

Do not describe the old way of doing something alongside the new way. The agent
sometimes follows the old one. Delete the old way, and let `git log` hold the
history.

Use one word for one thing throughout a skill. When you call the same artefact
a "spec", a "specification", and a "requirements document" in three sections,
the agent treats them as three different files.

## Review checklist

Run through the list below before committing a new skill or an edit to one.

- The description names the task and includes the phrasings a person would
  actually type, including the slash command form.
- The description says when not to use the skill, when the boundary is unclear.
- `SKILL.md` is under about 500 lines, and anything longer sits in a sibling
  file that `SKILL.md` names.
- Every instruction is something the agent could not have inferred.
- Every file path and command in the skill exists, and you checked each one.
- The prose follows the plain writing rules.
- No model version, date, or pull request number appears anywhere.
- One name is used for each artefact throughout.
- The folder holds no `package.json` and no test runner.

## Test the skill before you trust it

Start a fresh session, and ask for the task the way a person would, without
naming the skill. When the skill does not load, the description is wrong, and
the fix is to add the phrasing you just used.

Then run the skill on a real task and read what it produced. When the output is
wrong in a way the instructions permitted, tighten the instructions. When the
output is wrong in a way the instructions already forbade, the instruction is
buried, so move it earlier or make it a step rather than a note.
