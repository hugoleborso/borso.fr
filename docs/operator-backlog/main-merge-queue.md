---
status: open
found-in: '#424'
right: 'GitHub repository settings (merge queue)'
---

# Main merge queue

Turn on GitHub's merge queue for `main`, so each merge is tested on top of the one before it. Parallel kaizen sweeps write to the same shared files and collided on merge, as `every-sweep-appended-to-the-same-three-lists.md` records. A queue also covers the up-to-date requirement without forcing every branch to rebase by hand.

## Done when

The `main` ruleset carries a `merge_queue` rule, read with `gh api repos/hugoleborso/borso.fr/rulesets`.
