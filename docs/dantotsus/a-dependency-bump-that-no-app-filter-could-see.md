---
date: 2026-08-20
introduced-at: conception
detected-at: review
severity: high
related-pr: '#65, #66'
fix-pr: TBD
fix-commits: [21ed4b0]
eradication-level: 2
time-to-detect: days
tags: [ci, gates, github-actions, pnpm, deploy]
---

# A dependency bump that no app filter could see

## Symptom

React `19.0` → `19.2.8` and jsdom `25.0.1` → `30.0.1` merged to `main`
with every check green. Neither ran a single application test. The
`app-tests` job on both pull requests reports `skipped`, and so does
`deploy`, while the workflow as a whole concludes `success`.

The sites in production kept serving a bundle built against React
19.0 for as long as nothing else touched `apps/`.

## Root-cause chain

1. **Why did no application suite run?**
   `detect` emitted an empty app list, so the `app-tests` matrix had
   nothing to expand and its `if: needs.detect.outputs.apps != '[]'`
   guard skipped it.
2. **Why was the list empty?**
   `dorny/paths-filter` returned no matching key for the diff.
3. **Why did nothing match?**
   The diff touched `pnpm-workspace.yaml` and `pnpm-lock.yaml` only.
   Every key in `.github/path-filters.yml` was either `apps/<slug>/**`
   or `infra/cdk/**`.
4. **Why did the diff touch no file under `apps/`?**
   Because the repository uses a pnpm catalog. Each `package.json`
   says `"react": "catalog:"` and the version lives once, in
   `pnpm-workspace.yaml`. That is the point of a catalog, and it means
   a version change is invisible to a path filter written per app.
5. **Why did a skipped job still look like a pass?**
   A skipped job is not a failed job. The check list shows
   `app-tests — skipped` next to seven green ticks, and a reviewer
   reads the run's conclusion, not each job's.

**Root cause:** thought *"a change that affects an app touches a file
under `apps/`"*, actually *the catalog moved every version out of
`apps/` on purpose, so the files that decide what four applications
resolve match no app filter at all.*

## Detection failure causes

- **Typing:** not applicable — a YAML filter list is not typed against
  the repository layout.
- **Linter / static analysis:** `actionlint` validates workflow syntax
  and cannot know which paths ought to be covered.
  `check-app-registration.sh` walks the other direction only: it
  checks every app has a key, never that every consequential path has
  one.
- **Functional validation locally:** the pre-push hook is scoped with
  `vitest run --changed`, which walks the module graph from changed
  files. A catalog edit changes no module, so it too selected nothing.
- **CI:** this *is* the CI failure. The gate did not fail, it
  abstained, which is the worse of the two.
- **Code review:** a Dependabot pull request is reviewed by reading
  its diff and its checks. Both looked fine.
- **Production monitoring:** none — there is no check that the bundle
  in production was built from the current lockfile.

## Countermeasure

- **Code:** commit `21ed4b0` — a `deps` key in
  `.github/path-filters.yml` matching the workspace manifests and
  lockfile, treated as a fan-out at all three sites that compute the
  app list, exactly as `infra` already was.
- **Operator action:** none. The next dependency bump tests and
  redeploys all four apps by itself.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate now fires where it abstained)

**Reference:** commit `21ed4b0`

**The actual fix:**

```diff
  infra: 'infra/cdk/**'
+ deps:
+   - 'pnpm-workspace.yaml'
+   - 'pnpm-lock.yaml'
+   - 'package.json'
+   - 'apps/*/package.json'
+   - 'infra/*/package.json'
```

```diff
- if jq -e 'index("infra")' <<<"$CHANGES" >/dev/null; then
+ if jq -e 'index("infra") or index("deps")' <<<"$CHANGES" >/dev/null; then
```

**Sibling defects swept:** the same one-line condition existed in
`deploy.yml` and `preview.yml`, so a dependency bump skipped the prod
deploy and the preview build for the same reason. All three are fixed
in the one commit. `check-app-registration.sh` learned that neither
fan-out key names a directory under `apps/`.

**Property this changes:** a dependency-only commit now redeploys all
four production apps where it previously deployed none. That is the
intent — the sites were serving bundles built against the previous
versions — but a one-line catalog edit is now four deploys.

## See also

- [`the-backstop-nobody-was-standing-behind.md`](./the-backstop-nobody-was-standing-behind.md)
  — the other half of this pass: the run that *would* have caught the
  consequences was red and unread.
- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md)
  — the previous time this filter's behaviour was misread.
