# An edit script that asserts then writes at the end loses the edits that worked

The convenient shape for a multi-part text edit is to collect the replacements,
assert each one matched, and write once at the end:

```python
p = pathlib.Path('docs/standards/06-data-fetching.md')
s = p.read_text()

s = s.replace(old_table_row, new_table_row)      # matched
assert old_paragraph in s                         # matched, replaced
s = s.replace(old_paragraph, new_paragraph)
assert old_bullet in s                            # AssertionError
s = s.replace(old_bullet, new_bullet)

p.write_text(s)                                   # never reached
```

The failing assert is loud, so it looks safe. It is not: the two replacements
that already succeeded live only in the in-memory string, and the process exits
without writing. The file on disk is untouched and the script printed an error
about a *different* edit, so the natural next move is to fix that one edit and
move on — leaving the first two silently undone.

On PR #84 this happened to `06-data-fetching.md`. The paragraph telling readers
to write an `eslint-disable-next-line` had been rewritten, the assert on a
later `Enforced by` bullet failed, and nothing was written. The follow-up
script fixed only the bullet. The stale instruction survived two more review
rounds and was caught by a reviewer, not by a gate — by which point the rule it
described had changed, so following the document would have failed lint for the
opposite reason.

## What to do instead

**Write after each replacement.** The disk is the accumulator:

```python
def edit(path, pairs):
    p = pathlib.Path(path)
    s = p.read_text()
    for old, new in pairs:
        assert old in s, f"MISSING in {path}:\n{old[:200]}"
        assert s.count(old) == 1, f"AMBIGUOUS: {old[:60]}"
        s = s.replace(old, new)
    p.write_text(s)          # per file, and the loop is all-or-nothing per file
```

Per-file all-or-nothing is the right granularity: a file is either fully edited
or untouched, and a failure names the file that did not change. What must not
happen is one write covering several files, where a late failure discards
earlier files' successful edits.

Two habits that go with it:

- **Assert uniqueness, not just presence.** `s.count(old) == 1` catches an
  anchor that matches twice, which silently rewrites the wrong occurrence.
- **Re-read the file after the script says it failed.** The assumption that a
  failed script changed nothing is exactly what makes this expensive.

## Why it is not caught by anything

Nothing in the repository reads a document's prose against the rule it
describes. `check-doc-links` verifies links, `enforcement-ledger` verifies that
each `Enforced by` bullet names a mechanism that exists — neither reads a
sentence in the body and asks whether it is still true. That is a reviewer's
job, and reviewers read what is in front of them, not what an earlier script
meant to put there.

## See also

- [`../dantotsus/ten-review-rounds-on-a-two-file-bug-fix.md`](../dantotsus/ten-review-rounds-on-a-two-file-bug-fix.md)
  — the branch this happened on, and why it took two more rounds to surface.
