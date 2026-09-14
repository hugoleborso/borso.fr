---
date: 2026-09-14
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#95'
fix-pr: '#96'
fix-commits: [5d14095]
eradication-level: 2
time-to-detect: minutes
tags: [agent-browser, agents, harness, mobile, sandbox, tooling, documentation, validation]
---

# The phone-testing wrapper could not open the previews it is named after

## Symptom

Validating PR #95 on the previews called for a touch pass, which
`docs/knowledge/driving-previews-with-agent-browser-and-argent.md` says to
drive with `scripts/argent.sh`. Its first navigation:

```
h1 value="Your connection is not private"
button value="net::ERR_CERT_AUTHORITY_INVALID"
strong value="borsouvertures-pr-95.preview.borso.fr"
```

The hostname in the error is the preview's. Everything about the screen says
the preview has a bad certificate. The preview's certificate is fine —
`agent-browser` had opened the same URL a minute earlier.

## Root-cause chain

1. **Why did Chromium reject the certificate?**
   `scripts/argent.sh` launches it with `env -u HTTPS_PROXY …
   --no-proxy-server`. The sandbox's only route off-box is that proxy, so the
   browser went direct, and what answers a direct request is not the preview.

2. **Why is the flag there?**
   For the opposite failure, correctly. A Chromium that inherits `HTTPS_PROXY`
   sends `http://localhost:5174` out through the proxy and renders
   `ERR_CONNECTION_REFUSED`, which reads as the dev server being down. The
   comment above the flag says exactly this.

3. **Why did one target's fix become every target's setting?**
   The script was written against a local dev server and hardcoded what that
   target needs. The two modes are mutually exclusive — the flags that make
   localhost work are the flags that make a preview unreachable — and only one
   was expressible.

4. **Why did the document not warn about it?**
   It is worse than silent. It is titled *"Driving the previews with
   agent-browser and argent"*, it says **"Use `scripts/argent.sh` rather than
   the steps below. It encodes every one of them"**, and the steps below do
   cover the remote case: *"Keep `--ssl-version-max=tls1.2` if the browser must
   reach the internet"*. The prose was right and the script it delegates to
   encoded only half of it.

5. **Why did that survive review?**
   Because the repository gates *negative* claims about tools — a
   `does not work` line must carry a date, a rule written after this very
   document misdirected two phone audits. A positive claim that a wrapper
   handles a case gets no such gate, and it fails the same way: silently, for
   whoever trusts it.

**Root cause:** thought a wrapper could encode one network mode for every
target, actually loopback and the internet need opposite proxy flags fixed at
launch — so the wrapper worked for the target it was written against and failed
on the one in its own title, with an error naming the innocent host.

## Detection failure causes

- **Linter / actionlint:** `shellcheck` sees a valid flag list; nothing knows
  what the sandbox's egress looks like.
- **CI:** no job drives argent. The tool is for interactive agent use.
- **Code review:** the flag has a correct comment justifying it. A reviewer
  reads the justification and agrees, because it is true — for localhost.
- **Knowledge:** the document asserted the opposite of the behaviour, so
  reading it made things worse rather than better.

## Countermeasure

- **Code:** commit `5d14095` — the target decides the network mode.
- **Operator action:** a browser already running keeps the mode it launched
  with, so `scripts/argent.sh stop` first when switching between a dev server
  and a preview. The script now says so instead of silently reusing it.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the wrapper derives the setting instead of
hardcoding it)

**Reference:** [PR #96](https://github.com/hugoleborso/borso.fr/pull/96) ·
commit [`5d14095`](https://github.com/hugoleborso/borso.fr/commit/5d14095)

`classify_target` reads the URL passed to `start` and picks the mode: loopback
keeps `--no-proxy-server` with the proxy stripped, anything else keeps the
proxy and adds `--ssl-version-max=tls1.2`. Remote is the default for anything
unrecognised, because the remote flags still reach a loopback address through
no proxy while the reverse reaches nothing at all.

**The actual fix:**

```diff
+  if [ "$TARGET_IS_REMOTE" = yes ]; then
+    nohup "$chromium" … --ssl-version-max=tls1.2 …
+  else
+    env -u HTTP_PROXY -u HTTPS_PROXY … --no-proxy-server …
+  fi
```

Verified by running `scripts/argent.sh start
https://borsouvertures-pr-95.preview.borso.fr/` and reading back
`h1 value="Borsouvertures"` with the board's mini-diagrams, where the same
command previously produced Chromium's privacy screen.

**Sibling defects swept:** the `start` banner advertised
`run gesture-swipe --help`, a verb argent does not support on Chromium at all.
It now advertises `gesture-scroll` and `gesture-drag` and says what
`gesture-swipe` does instead of working — see the knowledge entry below.

## See also

- [`../knowledge/argent-gesture-swipe-does-nothing-on-chromium.md`](../knowledge/argent-gesture-swipe-does-nothing-on-chromium.md)
  — the second half of this: the verb that returns success and moves nothing.
- [`../knowledge/driving-previews-with-agent-browser-and-argent.md`](../knowledge/driving-previews-with-agent-browser-and-argent.md)
  — corrected by this commit.
- [`a-dialog-that-only-collapsed-on-a-phone.md`](./a-dialog-that-only-collapsed-on-a-phone.md)
  — what the phone pass is for, and why a broken phone pass costs findings
  rather than reporting an error.
