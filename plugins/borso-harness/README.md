# borso-harness

borso-harness is the engineering harness of the borso.fr monorepo, packaged as
a Claude Code plugin so that other repositories can load the same thing. It
holds:

- **Skills.** `/route`, `/specification`, `/technical-conception`, `/adr`,
  `/implementation`, `/technical-validation`, `/visual-validation`,
  `/standards-review`, `/code-standards`, `/blueprint`, `/open-pr`,
  `/dantotsu`, `/after-task-dantotsus`, `/tech-lead-orchestrator`,
  `/plain-writing` and `/writing-for-agents`.
- **Agents.** `technical-validator`, `visual-validator` and
  `standards-reviewer`, each of which reviews a branch without the main
  session's context. A session that installs the harness as a plugin lists
  them with the `borso-harness:` prefix.
- **Command.** `/feature-pipeline`, the contract a Dynamic Workflow follows from
  a ratified spec to an opened pull request.
- **Hooks.** Guards that refuse a `git push` piped into another command, a
  `pkill` or `killall`, a `git reset --hard` over uncommitted work, and a
  pull-request body the GitHub MCP server would strip or the body checker would
  refuse. Diagnostic hooks explain an empty checks list and a replayed ESLint
  cache error. A knowledge hook prints the knowledge entry whose `triggers:`
  match the file being written, the command about to run, or what a call
  printed; `scripts/knowledge-triggers.py check` is its gate. A formatting hook
  runs Prettier on each edited file when the repository has Prettier installed.
  A session hook creates the friction log.

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

`harness-path.sh`, in the plugin's `scripts/` folder, prints the resolved
table, or one path when you pass a key. The skills tell the agent to run it.
The hooks call it directly.

When a key points at a script that is not there, the skills report the step as
unverifiable instead of failing, and the `gh pr create` hook skips the budget
check. It still refuses a pull request with no body.

## Why the parts are linked rather than the plugin loaded

A cloud session never shows the workspace trust dialog, and Claude Code loads a
plugin that a repository ships only in a trusted workspace. It skips a
marketplace declared in `.claude/settings.json`, and it skips a plugin
directory placed under `.claude/skills/`. On this harness's first pull request
the second one was measured: the plugin was skipped, and a `git reset --hard`
over tracked changes went through because the guard hook had not loaded.

What a cloud session does load is a skill directory in `.claude/skills/`, an
agent file in `.claude/agents/`, a command in `.claude/commands/`, and a hook
in `.claude/settings.json`. So a repository links each part of the plugin into
those places, and declares the hooks in its settings.
`link-into.sh`, in the plugin's `scripts/` folder, does both halves:

```sh
link-into.sh <repo-root> <prefix>            # create or repair the links
link-into.sh --hooks <repo-root> <prefix>    # print the settings.json hooks
link-into.sh --check <repo-root> <prefix>    # fail when anything is out of step
```

`<prefix>` is where the plugin sits in that repository. The links are
relative, so they survive a fresh clone. A skill directory that already exists
as a real directory gets its `SKILL.md` linked instead.

The skills refer to their own files as `${CLAUDE_PLUGIN_ROOT}/…`. Claude Code
fills that in only for a plugin, so the harness's SessionStart hook exports
`CLAUDE_PLUGIN_ROOT` to the session's shell when the parts are linked, and each
skill says how to find the folder if the variable still reads unexpanded.

## Install it in a repository that vendors borso.fr

This is the setup for `hugoleborso/talos`, and for any repository that keeps
borso.fr as a git submodule.

1. Add the submodule.

   ```sh
   git submodule add https://github.com/hugoleborso/borso.fr.git vendor/borso.fr
   ```

2. Link the parts and add the hooks. Run the script from the submodule, then
   merge the printed `hooks` object into `.claude/settings.json`:

   ```sh
   vendor/borso.fr/plugins/borso-harness/scripts/link-into.sh . vendor/borso.fr/plugins/borso-harness
   vendor/borso.fr/plugins/borso-harness/scripts/link-into.sh --hooks . vendor/borso.fr/plugins/borso-harness
   ```

   Each hook entry runs a script through
   `"$CLAUDE_PROJECT_DIR"/vendor/borso.fr/plugins/borso-harness/hooks/`. Commit
   the links and the settings. Run the `--check` form in the repository's own
   pre-commit hook or CI, so that a harness update that adds a skill or a hook
   is noticed.

3. Write `borso-harness.json` in the `.claude/` folder. Talos applies
   borso.fr's standards to its own application and keeps its own records, so
   it reads the standards from the submodule and everything else from its own
   tree:

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

4. Add `KAIZEN.md` and `.claude/knowledge-triggers.json` to `.gitignore`. The
   session hook creates the first at the repository root, and
   `/after-task-dantotsus` reads and deletes it. The knowledge hook compiles the
   second from the `knowledge` folder's front matter whenever an entry is newer.

5. Check the submodule out before Claude Code starts. The links point into
   `vendor/borso.fr`, so they resolve only once the submodule is there, and
   Claude Code reads skills and agents when the session starts. A SessionStart
   hook that runs `git submodule update` is too late for that session. Locally,
   clone with `--recurse-submodules`. In the cloud environment, make the setup
   script run `bash scripts/setup-cloud.sh`, and have that script run
   `git submodule update --init`.

To move to a newer harness, update the submodule, rerun `link-into.sh` with
`--check`, and commit the new pointer with any new links or hook entries.

## Install it as a plugin, for local sessions

A repository that does not vendor borso.fr can install the plugin itself.
Declare the marketplace and enable the plugin in `.claude/settings.json`:

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

Claude Code adds the marketplace once you trust the folder, and loads the
plugin from the marketplace's copy of `main`. Cloud sessions skip this step, so
the harness is missing there. For one person rather than a whole repository,
run `claude plugin marketplace add hugoleborso/borso.fr` and then
`claude plugin install borso-harness@borso`.

Steps 3 and 4 of the submodule route apply here too. Every path key that names
a borso.fr script needs a copy of that script in the repository, or stays
unset. Do not combine the two routes in one repository: the hooks would run
twice.

## How borso.fr loads it

borso.fr links its own plugin the same way Talos does, with the prefix
`plugins/borso-harness`, and `scripts/check-harness-links.sh` runs the
`--check` form in pre-commit and CI. An edit to the plugin on a branch takes
effect at the next session on that branch.
[ADR-0026](../../docs/adr/0026-the-harness-ships-as-a-plugin-linked-into-claude.md)
records why the parts are linked.

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

`check-hook-decisions.sh`, in the plugin's `scripts/` folder, feeds every
refusing hook a command it must refuse and a mention of that command it must
let through. borso.fr runs it in pre-commit. A repository that changes a hook can run it the same way:

```sh
vendor/borso.fr/plugins/borso-harness/scripts/check-hook-decisions.sh
```
