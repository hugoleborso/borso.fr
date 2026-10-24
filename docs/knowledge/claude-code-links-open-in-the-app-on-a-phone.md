---
summary: 'On a phone with the Claude app, a `claude.ai/code` link opens in the app, which prefills only `code/new` with `q` and `repo`, and drops the whole link when it carries `environment`.'
triggers:
  paths:
    - 'apps/talos/site/src/**'
  commands:
    - 'claude\.ai/code\?'
---

# Claude Code links open in the app on a phone

A link to `https://claude.ai/code` has two readers, and they do not accept the same parameters.

## What happens

`https://claude.ai/code/...` is a universal link. On a phone with the Claude app installed, the operating system hands the link to the app; without the app, the browser opens it. Tapping it from a home-screen web app follows the same rule.

The two readers prefill a new session differently:

| | Claude Code on the web | Claude app |
| --- | --- | --- |
| Source | Web quickstart, « Pre-fill sessions » | support.claude.com article 14898120, « Open the Claude mobile app with a link » |
| Route | `claude.ai/code` | `claude.ai/code/new` (or `claude://code/new`) |
| Prompt | `prompt`, alias `q` | `q`, alias `prompt` |
| Repository | `repositories`, alias `repo` | `repo` (`owner/name`, ignored if not in the connected GitHub account) |
| Environment | `environment` (name or id) | not documented; its presence makes the app drop the link (2026-10-24) |
| Other | `prompt_url` | `branch`, `mode` |

`https://claude.ai/code?prompt=...` works in a browser and opens the app with an empty composer. Talos shipped that link and lost the prompt of every « Discuter » on Hugo's phone (PR #149).

## What to write

```
https://claude.ai/code/new?repo=<owner/name>&environment=<env id>&q=<prompt>
```

The app reads `q` and `repo` on `code/new`. The support article presents the https form as the universal-link equivalent of `claude://code/new`, which opens in the browser when the app is absent. This repository builds that link in one place, `apps/talos/site/src/lib/claude-code-address.core.ts`.

## The app drops a link that carries `environment`

On 2026-10-24 Talos's links opened the Claude app on its session list, with no new session and no prompt, from the home-screen app with `https://` and then with `claude://`. Hugo tapped three links from Safari: `claude://code/new?q=test` and `claude://code/new?repo=hugoleborso%2Ftalos&q=test` opened a new session with « test »; the same link with `&environment=env_test` added opened the session list. The app documents no `environment` parameter and rejects the whole link when it gets one.

Talos therefore writes `claude://code/new?repo=…&q=…` from the iOS home-screen app, without `environment`, and keeps `environment` on the `https://` link everywhere else. A session started from the app runs in the app's default environment. A `https://` link carrying `environment`, tapped in Safari on a phone with the app installed, still lands on the session list.

## What still does not work

Last verified: 2026-10-08 — read support.claude.com article 14898120 and the web quickstart's « Pre-fill sessions »; no phone was available to tap the link.

- **Environment.** The app documents no `environment` parameter, so a session started from the app may run in the default environment. Check it in the composer before sending.
- **Verification.** Nothing in a hosted session can tap a link on a phone. Unverified from here: whether the web serves `code/new` itself or redirects it to `code`. The support article only says that the link « opens in the browser ».

## See also

- [`the-link-the-app-opened-without-its-prompt.md`](../dantotsus/the-link-the-app-opened-without-its-prompt.md)
