# Talk to Talos, and clean home-screen icons

## Goal

The owner never used the Message screen. He wants one tap, from any screen, that opens a new Claude Code session on the Talos agent repository in the « Talos build » environment. The installed app's icon must be the Phaistos coin, sharp and without transparency on iOS.

## Data shape

- `GET /api/messages/claude-code` is unchanged: `{ repository, environments: { talos, build } }`. `build` is the SSM `String` parameter `/talos/claude-environment-build`. On 2026-11-13 it held the id of « Talos build » (measured with `aws ssm get-parameter`).
- `TalkToTalosLink { href: string | undefined, target: string | undefined }`, from `useTalkToTalosLink`.
- Route paths: `TALK_PATH = '/talk'`, `ROUTINE_RUN_LIST_PATH = '/runs'`.
- Manifest shortcut: `{ name: 'Parler à Talos', short_name: 'Parler', url: '/talk' }`.
- Service worker cache version: `talos-v3`.

## Behaviour

1. The tab bar holds Jour, Todo, Décider, Mémoire, then a filled bronze « Parler à Talos » link, on every screen inside the shell.
2. The link is the one `buildClaudeCodeAddress` writes for the build environment, with the prompt « Tu es Talos. Hugo veut te parler : ». On the web it is `https://claude.ai/code/new?repo=…&environment=…&q=…` and opens in a new tab. From the iOS home-screen app it is `claude://code/new?repo=…&q=…`, without `environment`, because the Claude app drops a link that carries one (`docs/knowledge/claude-code-links-open-in-the-app-on-a-phone.md`, tested on a phone on 2026-10-24). The session then starts in the app's default environment.
3. `/talk` shows « Parler à Talos » and leaves for the same link as soon as it is known, with `location.replace`, so the back button does not land on it.
4. The Message screen, its composer, `POST /api/routine/runs`, the message text rule and the toasts of a launch are removed. Routine runs keep their table. Old `message` rows stay listed.
5. « Lancements » moves to `/runs`, a screen of its own reached from the tile of the day, with an empty state.
6. The home-screen icons are opaque RGB PNGs, no longer 256-colour palettes. The coin keeps its framing: 85 % of the side, 66 % on the maskable icon.
7. The cache version moves to `talos-v3`, so a device drops the icons cached by `talos-v2`.

## Out of scope

- An icon drawn from a source above 360 px. Neither the Drive original nor the Commons file was reachable (operator backlog).
- The routine « Talos : message ». Decisions on proposals still fire it through `/talos/fire-url`.
