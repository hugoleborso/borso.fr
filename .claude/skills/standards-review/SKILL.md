---
name: standards-review
description: Review the branch's changed source against the rules in docs/standards/ that no lint rule can check, and seal what passes so CI can gate on the review without running a model. Use when the user says "/standards-review", "review this against the standards", "seal this branch", when `scripts/standards/seal.ts verify` fails, or before opening a PR. Dispatches the standalone `standards-reviewer` agent, which reads the generated reviewer checklist in docs/standards/enforcement-ledger.md rather than a remembered list of rules.
---

# Standards review

Most of `docs/standards/` is a lint rule. The rest is not, and cannot be: whether a comment says something the code cannot, whether a name is the one the domain uses, whether a repository is projecting when it should be returning rows.

This skill reviews that residue, and records the result in a form CI can check without running any inference.

## The seal, and why it exists

CI runs no model here. So the agent reviews the code and records the SHA-256 of the content it cleared, in `docs/standards/seals.jsonl`. CI hashes the files the branch changed and fails on any hash it cannot find. Hashing needs no model, and it is exact.

Three consequences worth knowing before you rely on it:

- **Editing a file after sealing unseals it.** The hash no longer matches. This is the point: a review of content that has since changed is not a review.
- **Moving a file keeps its seal.** The content is what is sealed, not the path, so this repository's mass renames do not force a re-read of code nobody changed.
- **Rewording a standard invalidates the seals taken under the old wording.** Each seal records the hash of `enforcement-ledger.md` at review time.

The seal is an attestation, not a signature. Nothing in a checkout can sign anything, and anyone can append a line by hand. What it stops is the ordinary failure — reviewing and then editing, or never reviewing at all. Do not describe it as tamper-proof.

## Before dispatching

1. The ledger must be current, because it is the agent's checklist:

   ```bash
   pnpm exec tsx scripts/standards/enforcement-ledger.ts --check
   ```

   If it fails, fix that first. A stale ledger means the agent reviews against the wrong list, and every seal it takes is against a hash CI will reject anyway.

2. Find what is unsealed:

   ```bash
   pnpm exec tsx scripts/standards/seal.ts verify --base origin/main
   ```

   When it reports nothing to seal, there is no review to run. Say so and stop.

## Dispatching

Send the `standards-reviewer` agent with a brief carrying exactly these fields:

- `base_ref` — usually `origin/main`.
- `report_path` — `docs/standards/reviews/<branch>-<timestamp>.md`.
- `reviewer_name` — `standards-reviewer`.

The agent runs standalone. Do not pass it your conversation, your intent, or your opinion of the code: it exists to read the diff without knowing what the implementer had convinced themselves of.

**Exactly those three fields, and no file list.** The temptation, having just run `seal.ts verify` to find out whether there is a review to run, is to paste its output into the brief. Do not: the brief is written once and the tree keeps moving, so by the time the agent reads it a commit has landed and the list is short by a file. That happened twice on one branch, and both times the agent followed the brief over the gate and silently skipped a file — a file that then went to `main` unsealed while the gate said it was reviewed. The agent runs `seal.ts verify` itself; naming files can only make its answer worse. Say what changed if it helps the agent aim, and let the gate say which files that means.

## After it returns

- `PASS` — re-run `seal.ts verify`; it should be clean. Commit `docs/standards/seals.jsonl` with the change it covers, in the same commit or the next one.
- `FINDINGS` — fix them, then run this skill again. The fixes change the content, so the files need sealing again regardless.
- `UNCLEAR` — read the named files yourself and decide. Seal by hand only when you have read the file, and put your own name on it, not the agent's.

Never seal to get a green gate. A file with an open finding stays unsealed; that is the only thing making the gate worth having.

## Findings on code the branch did not write

Touching one line of a file puts the whole file in front of a reviewer for the first time, so a small change can return findings that are real and are not its work. Each finding carries `Introduced` and `Fix size` for exactly this: read them together before fixing anything.

A one-line fix on a pre-existing finding is cheaper to ship here than to schedule. A refactor is not, and shipping it here buries the change the branch was actually for. Say which you are doing, in the commit message, and take the rest in its own branch — the seal on the untouched half stays valid either way, because a seal is on content and not on a path.

The cost of getting this wrong compounds: each round's fix touches new files, which the next round reviews for the first time. One branch reached ten rounds this way, and the last five were on code its subject never went near.

## Where the checklist comes from

`docs/standards/enforcement-ledger.md`, section **"What only a reviewer can check"**. It is generated from the `reviewer` bullets in the standards, so adding a reviewer bullet to a standard adds it to the agent's scope on the next generation, and nothing has to be remembered or copied.

It is generated and **not committed**, so run `scripts/reports.sh standards` before reading it or hashing it. A seal records the hash of the ledger at review time; hashing an absent file is how a seal would silently record nothing.

To widen what the agent checks, write the bullet in the standard. Not here.
