# Provenance

`SKILL.md` in this folder is a verbatim copy of the upstream plain writing
skill by Shreya Shankar, published at
https://github.com/docwriter-org/plain-writing-skill under the MIT licence.
The licence text is in `LICENSE` beside it.

We keep `SKILL.md` unchanged so that a later upstream update is a plain file
copy and not a merge. Anything we want to add about how the skill applies to
this repository goes in the present file instead.

## How the skill applies here

Apply the plain writing rules to every piece of prose we write, which includes
the standards under `docs/standards`, the blueprints under `docs/blueprints`,
the dantotsus, the architecture decision records, commit message bodies, and
pull request descriptions.

Do not apply the rules to code. Identifier names follow
`docs/standards/01-naming.md`, and the two rule sets disagree on purpose,
because a long declarative identifier is good code and a long sentence full of
clauses is bad prose.

## Where the rules and this repository disagree

The plain writing skill forbids em dashes, and `CLAUDE.md` and the older
documents in `docs/knowledge` use them heavily. We are not rewriting the older
documents in bulk. New prose follows the plain writing rules, and an older
document gets rewritten when someone edits it for another reason.
