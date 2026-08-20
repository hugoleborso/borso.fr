# knip's Stryker plugin reads the runner, not the config the runner points at

`stryker.config.js` can name the vitest config the runner should use:

```js
export default defineStrykerConfig({
  mutate: ['src/**/*.utils.ts'],
  vitest: { configFile: 'vitest.mutation.config.ts' },
});
```

knip's Stryker plugin resolves the runner, checker and plugin **package names**
from that config and stops there. It never follows `vitest.configFile`, so the
file it points at looks like a file nothing references, and knip reports it as
unused.

Declaring the Stryker dependencies does not help — the complaint is about the
config file, not the packages.

Two ways out, both in use here:

- The four application workspaces pass by accident: their `knip.json` project
  globs do not include the workspace root, so `vitest.mutation.config.ts` is not
  in the file set knip considers at all.
- `infra/cdk` needed the file added to knip's entry list explicitly.

If you add a mutation config to a new workspace and knip flags it, this is why.
Check the workspace's project globs first — the fix is usually that the globs
are inconsistent with the other workspaces, not that the file is genuinely
unreferenced.

Related, and worth reading together because both are about Stryker's config
reaching further than the tools around it expect:
[`stryker-sandbox-breaks-a-global-setup-outside-the-workspace.md`](./stryker-sandbox-breaks-a-global-setup-outside-the-workspace.md).
