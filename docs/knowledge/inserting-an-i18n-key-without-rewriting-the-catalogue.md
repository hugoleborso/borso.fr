# Inserting an i18n key without rewriting the catalogue

Adding one translation key to `apps/pragma/site/src/i18n/{en,fr}.json` with a
parse, an assignment and a re-serialise produced a 68-line diff per file for a
6-line addition:

```python
data = json.load(open(path), object_pairs_hook=OrderedDict)
data['crash'] = block
json.dump(OrderedDict(sorted(data.items())), open(path, 'w'), indent=2)
```

The sort is what did it. The catalogues are *mostly* sorted, so sorting looks
free, and it is not: `audience` sat at the end of the file rather than in
alphabetical position, and re-sorting moved a 31-line block that had nothing
to do with the change. A reviewer then reads a diff where the actual addition
is six lines out of seventy, and `git blame` on the moved block points at the
wrong commit.

**Insert the lines, do not rewrite the file.** Find the top-level key the new
one sorts before, and splice the block in above it:

```python
lines = open(path, encoding='utf-8').read().split('\n')
insert_at = next(i for i, line in enumerate(lines) if line.startswith('  "fileDrop"'))
out = '\n'.join(lines[:insert_at]) + '\n' + block + '\n'.join(lines[insert_at:])
```

Then check the result parses, and check the diff is only the lines you meant:

```sh
python3 -c "import json; json.load(open('apps/pragma/site/src/i18n/en.json'))"
git diff --stat apps/pragma/site/src/i18n/
```

Six insertions per file, nothing else. The same applies to any committed JSON
a human reads as a list: `package.json`, `knip.json`, the manifest. A
formatter would settle this, and Prettier does format these files, but it
preserves key order by design, so the order is yours to keep stable.

**If the catalogues are ever sorted properly, sort them in a commit of their
own** that changes nothing else, so the churn is reviewable once instead of
riding along with a feature.
