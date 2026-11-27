---
date: 2026-09-14
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#95'
fix-commits: [5d140956dd, c54e32da7]
eradication-level: 1
eradication-paths: [scripts/phone.sh]
time-to-detect: minutes
tags: [agent-browser, agents, harness, mobile, sandbox, tooling, documentation, validation]
zone: scripts/phone.sh
recurs: [two-audits-that-sent-no-touch-events]
---

# The phone-testing wrapper could not open the previews it is named after

## User impact

Validating PR #95 on the previews called for a touch pass.
`docs/knowledge/driving-previews-with-agent-browser-and-argent.md` said to
drive it with `scripts/argent.sh`. Its first navigation showed Chromium's
privacy screen (measured by the validator of #95):

```
h1 value="Your connection is not private"
button value="net::ERR_CERT_AUTHORITY_INVALID"
strong value="borsouvertures-pr-95.preview.borso.fr"
```

| | Seen | Expected |
| --- | --- | --- |
| `scripts/argent.sh start https://borsouvertures-pr-95.preview.borso.fr/` | A certificate error naming the preview | The preview's board, which `agent-browser` had opened a minute earlier |

The preview's certificate was fine. The error named an innocent host.

## Causal chain

- Chromium rejected the preview's certificate.
  - `scripts/argent.sh` launched it with the proxy stripped and
    `--no-proxy-server`. The sandbox's only route off-box is that proxy, so
    the browser went direct, and what answers a direct request is not the
    preview. The faulty line, from `2e581bcfe` (2026-08-14):

    ```bash
    # `env -u` strips the proxy the sandbox exports, and --no-proxy-server stops
    # Chromium reading any other source for one. Without both, localhost fails.
    env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
      nohup "$chromium" \
      … --headless=new --no-sandbox --disable-dev-shm-usage --no-proxy-server \
    ```

    - The flag was right for a local dev server. A Chromium that inherits
      `HTTPS_PROXY` sends `http://localhost:5174` out through the proxy and
      renders `ERR_CONNECTION_REFUSED`. The comment above the flag says so.
      - The wrapper launched its own Chromium with one network mode, fixed
        at launch. Loopback and the internet need opposite proxy flags, so
        only one target could work. **Machine.**
        - The agent that wrote it had the remote case in front of it. The
          same commit edited the knowledge entry, which already said "Keep
          `--ssl-version-max=tls1.2` if the browser must reach the internet".
          It encoded only the local target it was testing against. **Man.**

## Root cause of occurrence

*Thought one set of launch flags serves every target of a phone wrapper,
actually loopback needs the proxy stripped and a preview needs it kept, and
a browser keeps its network mode for its whole life.* **Machine**, with a Man
branch.

Under the agentic 4M rule the writer's cause is Man. The document holding the
remote case was loaded: `2e581bcfe` added 13 lines to it. So the fix is not
another document. It is a tool shape that cannot hold one mode for every
target, which is what the eradication below removes.

## Detection failure causes

- **Linter:** `shellcheck` sees a valid flag list. Nothing knows what the
  sandbox's egress looks like.
- **CI:** no job drove argent. It was for interactive agent use.
- **Code review:** the flag had a correct comment justifying it. A reviewer
  reads it and agrees, because it is true for localhost.
- **Knowledge:** the entry was titled *"Driving the previews with
  agent-browser and argent"* and said "Use `scripts/argent.sh` rather than
  the steps below". A positive claim that a wrapper handles a case had no
  gate, while a "does not work" line must carry a date.

## Countermeasure

Commit `5d140956dd` (PR #97) made the target decide the network mode.
`classify_target` read the URL passed to `start`. Loopback kept
`--no-proxy-server`. Anything else kept the proxy and added
`--ssl-version-max=tls1.2`. Verified by `scripts/argent.sh start
https://borsouvertures-pr-95.preview.borso.fr/` reading back
`h1 value="Borsouvertures"`.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** #224, commit `c54e32da7` (2026-10-29), which deleted
`scripts/argent.sh` and `classify_target` with it.

The commit message says: "agent-browser now finds the bundled Chromium and
loads https on its own (measured on 0.35.2 against borso.fr, pragma.borso.fr,
github.com), so scripts/browser.sh, the agent-browser config written at
SessionStart and argent are gone. scripts/phone.sh keeps the real touch path
(375 px, coarse pointer, Input.dispatchTouchEvent) on the agent-browser
session."

```diff
- scripts/argent.sh   | 300 -----
+ scripts/phone.sh    |  52 +++++
```

No wrapper in the repository launches a second Chromium, so none can fix a
network mode. `scripts/phone.sh` drives agent-browser's own session, which
inherits the sandbox's network for both a dev server and a preview.

**Proof it can fail:** `grep -rn "no-proxy-server" scripts .claude` finds no
launch flag today. Before #224 it found the line above in
`scripts/argent.sh`.

**Similar instances:** `scripts/browser.sh`, a second wrapper with its own
launch flags, was deleted by the same commit. `grep -rln "chromium.launch"
scripts apps` lists the Playwright callers, which take their network from
the environment, not from a hardcoded flag.
