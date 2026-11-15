# docs/

Operational + architectural docs for the `borso.fr` monorepo. Read [`/CLAUDE.md`](../CLAUDE.md) first for conventions; this folder covers the *why* and the *how*.

Each file's first line names what it covers, and file names say what they hold. Run `ls docs` to see the files and folders, and `head -3 docs/*.md` to read what each top-level page covers. To find a topic, search for it:

```bash
grep -ril "<topic>" docs --include='*.md'
```
