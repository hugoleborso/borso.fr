---
status: open
found-in: '#424'
right: 'GitHub repository settings (rulesets)'
---

# Main ruleset requires CI and an up-to-date branch

Add a ruleset on `main` that requires the `ci` checks to pass and the branch to be up to date before a merge. Today `main` has no branch protection (404) and no ruleset (`[]`), measured in `docs/dantotsus/two-branches-took-the-same-migration-number.md`. The merge hook covers only merges it sees and lets one through when the head's checks cannot be read, when no pull request is named, or when the merge comes from the web UI. Two branches that each pass alone can still merge into a red `main`, as `a-red-pull-request-only-luck-kept-off-main.md`, `a-warning-that-arrives-with-the-merge.md` and `two-merges-sixteen-seconds-apart-one-untested-main.md` record.

## Done when

`gh api repos/hugoleborso/borso.fr/rulesets` lists a ruleset targeting `main` with a `required_status_checks` rule and `strict_required_status_checks_policy: true`.
