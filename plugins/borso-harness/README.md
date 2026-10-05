# borso-harness

borso-harness is the engineering harness of the borso.fr monorepo, packaged as
a Claude Code plugin so that other repositories can load the same thing. It
holds:

- **Skills.** `/route`, `/specification`, `/technical-conception`, `/adr`,
  `/implementation`, `/technical-validation`, `/visual-validation`,
  `/standards-review`, `/code-standards`, `/blueprint`, `/open-pr`,
  `/dantotsu`, `/after-task-dantotsus`, `/tech-lead-orchestrator`,
  `/plain-writing` and `/writing-for-agents`.
- **Agents.** `borso-harness:technical-validator`,
  `borso-harness:visual-validator` and `borso-harness:standards-reviewer`, each
  of which reviews a branch without the main session's context.
- **Command.** `/feature-pipeline`, the contract a Dynamic Workflow follows from
  a ratified spec to an opened pull request.
- **Hooks.** Guards that refuse a `git push` piped into another command, a
  `pkill` or `killall`, a `git reset --hard` over uncommitted work, and a
  pull-request body the GitHub MCP server would strip or the body checker would
  refuse. Diagnostic hooks explain an empty checks list and a replayed ESLint
  cache error. A formatting hook runs Prettier on each edited file when the
  repository has Prettier installed. A session hook creates the friction log.

Each skill and agent opens with a short note on paths. The paths these files
name are borso.fr's layout, and the plugin reads every one of them through the
consuming repository's configuration.

## Configure the paths

The harness reads a few places in the repository that uses it: the standards,
the dantotsus, the knowledge entries, the ADRs, the feature folders, and some
helper scripts. A repository declares where it keeps each one in a file named
`borso-harness.json` in its `.claude/` folder. A key that the file does not set
keeps borso.fr's default, so borso.fr itself has no such file.

| Key | Default | What reads it |
| --- | --- | --- |
| `standards` | `docs/standards` | `/code-standards`, `/standards-review`, the validators |
| `dantotsus` | `docs/dantotsus` | `/dantotsu`, `/after-task-dantotsus` |
| `knowledge` | `docs/knowledge` | `/dantotsu`, `/after-task-dantotsus` |
| `adr` | `docs/adr` | `/adr`, `/open-pr`, `/tech-lead-orchestrator` |
| `features` | `docs/features` | the feature pipeline skills, `kaizen.sh archive` |
| `kaizenFile` | `KAIZEN.md` | `kaizen.sh`, the refusal logger in the hooks |
| `blueprintIndex` | `.claude/skills/blueprint/blueprint-index.md` | `/blueprint`, `/code-standards`, `/route` |
| `reports` | `scripts/reports.sh` | every skill that reads a generated file |
| `seal` | `scripts/standards/seal.ts` | `/standards-review` |
| `prBodyCheck` | `scripts/pr/check-pr-body.ts` | `/open-pr`, the `gh pr create` hook |
| `browser` | `scripts/browser.sh` | `/visual-validation`, `/implementation` |
| `argent` | `scripts/argent.sh` | `/visual-validation` for touch checks |

The file holds one object, `paths`:

```json
{
  "paths": {
    "standards": "vendor/borso.fr/docs/standards",
    "dantotsus": "docs/dantotsus"
  }
}
```

`harness-path.sh`, in the plugin's `scripts/` folder, prints the resolved table, or one path when you pass
a key. The skills tell the agent to run it. The hooks call it directly.

When a key points at a script that is not there, the skills report the step as
unverifiable instead of failing, and the `gh pr create` hook skips the budget
check. It still refuses a pull request with no body.

## Install it in a repository that vendors borso.fr

This is the setup for `hugoleborso/talos`, and for any repository that keeps
borso.fr as a git submodule. The plugin loads from the submodule as a
skills-directory plugin, which needs no marketplace. A cloud session does not
install a marketplace that a repository declares, so this is the route that
works in cloud sessions as well as local ones.

1. Add the submodule.

   ```sh
   git submodule add https://github.com/hugoleborso/borso.fr.git vendor/borso.fr
   ```

2. Link the plugin into the project's skills directory. Claude Code loads a
   directory under `.claude/skills/` that holds a `.claude-plugin/plugin.json`
   as a plugin, and it follows the symlink.

   ```sh
   ln -s ../../vendor/borso.fr/plugins/borso-harness .claude/skills/borso-harness
   ```

3. Write `borso-harness.json` in the `.claude/` folder. Talos applies borso.fr's standards to its
   own application and keeps its own records, so it reads the standards from
   the submodule and everything else from its own tree:

   ```json
   {
     "paths": {
       "standards": "vendor/borso.fr/docs/standards",
       "dantotsus": "docs/dantotsus",
       "knowledge": "docs/knowledge",
       "adr": "docs/adr",
       "features": "docs/features",
       "browser": "vendor/borso.fr/scripts/browser.sh",
       "prBodyCheck": "vendor/borso.fr/scripts/pr/check-pr-body.ts"
     }
   }
   ```

   The body checker runs with `node_modules/.bin/tsx` from the repository root,
   so Talos needs `tsx` installed for the budget check to run. Without it, the
   hook only refuses an empty body. The blueprint index, `reports.sh` and
   `seal.ts` index and seal borso.fr's own layout. Leave those keys unset until
   Talos has its own, and the skills that need them will say so.

4. Add `KAIZEN.md` to `.gitignore`. The session hook creates it at the
   repository root, and `/after-task-dantotsus` reads and deletes it.

5. Make sure the submodule is checked out before Claude Code starts. Claude
   Code reads the plugin when the session starts, so a SessionStart hook that
   runs `git submodule update` is too late for that session. Locally, clone
   with `--recurse-submodules`. In a cloud environment, put
   `git submodule update --init` in the environment's setup script. Whether a
   cloud session checks out submodules without it is unverified from here.

6. Trust the folder once in a local session. A project skills-directory plugin
   loads only in a workspace you have trusted. Then check that it loaded:

   ```sh
   claude plugin list
   ```

   The output lists `borso-harness@skills-dir` with `Status: ✔ loaded`.

To move to a newer harness, update the submodule and commit the new pointer.
The plugin has no `version` field, so Claude Code always loads the files that
are checked out.

## Install it in a repository that does not vendor borso.fr

Declare the marketplace and enable the plugin in the repository's
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "borso": {
      "source": { "source": "github", "repo": "hugoleborso/borso.fr" }
    }
  },
  "enabledPlugins": {
    "borso-harness@borso": true
  }
}
```

Claude Code adds the marketplace after you trust the folder, and loads the
plugin from the marketplace's copy of `main`. Cloud sessions skip this step, so
the harness is missing there. Use the submodule route when cloud sessions
matter. For one person rather than a whole repository, run
`claude plugin marketplace add hugoleborso/borso.fr` and then
`claude plugin install borso-harness@borso`.

Steps 3 and 4 of the submodule route apply here too. Every path key that names
a borso.fr script needs a copy of that script in the repository, or stays
unset.

## How borso.fr loads it

borso.fr links `.claude/skills/borso-harness` to `../../plugins/borso-harness`,
so it loads the plugin the same way Talos does, from its own working tree. An
edit to the plugin on a branch takes effect at the next session on that
branch. [ADR-0026](../../docs/adr/0026-the-harness-ships-as-a-plugin-loaded-from-the-skills-directory.md)
records why this route was chosen over the marketplace.

## What is not in the plugin

The plugin carries the agent side of the harness. The repository side stays in
each repository:

- The standards documents themselves, under `docs/standards/` in borso.fr. A
  consumer points `standards` at them.
- The ESLint rules in `eslint-rules/`, `eslint.config.js`, the Husky hooks and
  the `scripts/check-*.sh` gates. These enforce the standards at commit time
  and in CI, and a consumer wires its own.
- The blueprint generators in `.claude/skills/blueprint/`, which index
  borso.fr's application layers.
- borso.fr's own hooks in `.claude/settings.json`: the dependency install at
  session start, the rtk command rewrite, the blueprint seeding on a new file
  and the notice that a merge deploys to production.

## Check the hooks

`check-hook-decisions.sh`, in the plugin's `scripts/` folder, feeds every refusing hook a command it must
refuse and a mention of that command it must let through. borso.fr runs it in
pre-commit. A repository that changes a hook can run it the same way:

```sh
vendor/borso.fr/plugins/borso-harness/scripts/check-hook-decisions.sh
```
