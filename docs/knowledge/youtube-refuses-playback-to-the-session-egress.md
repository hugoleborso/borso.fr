---
summary: 'An embedded YouTube video never plays in a hosted session: YouTube answers its bot check ("Sign in to confirm you are not a bot", embed error 150/152) for every id, so a playback row needs a stubbed iframe API, not the real player.'
triggers:
  paths:
    - 'apps/*/site/src/lib/youtube-player.adapter.ts'
    - 'apps/*/site/src/components/organisms/YoutubePassagePlayer.tsx'
  output:
    - 'Video unavailable'
    - 'This video is not available'
    - 'confirm you.re not a bot'
---

# YouTube refuses playback to the session egress

PR #327 left three visual validation rows UNVERIFIABLE (09, 28, 34 in
`docs/features/pragma/composition-inspirations/validation/visual-validation-2026-11-14-0026.md`).
The embedded player showed "Video unavailable / This video is not available"
for every id. The validator guessed "the sandbox". This is what it is.

## The measured cause

Measured on 2026-11-14:

- **Not the network policy.** Through the proxy, `www.youtube.com/iframe_api`,
  `/embed/<id>`, `youtube-nocookie.com/embed/<id>` and `i.ytimg.com` answer 200.
- **Not the embed setting of the video.** `M7lc1UVf-VE`, the demo video of
  YouTube's own iframe API docs, fails the same way as the app's ids.
- **Not the page origin.** The page was served over `http://127.0.0.1`, as
  `pnpm dev` serves it, with `origin` set. The player fires `onReady`, then
  state 3 (buffering), then `onError` 150.
- **Not headless Chromium.** `curl` posting to `www.youtube.com/youtubei/v1/player`
  with a desktop user agent gets the same refusal:
  - With client `WEB` it gets `LOGIN_REQUIRED`, "Sign in to confirm you're
    not a bot".
  - With client `WEB_EMBEDDED_PLAYER` it gets `ERROR`, "This video is
    unavailable", "Error code: 152 - 18".

So YouTube's bot check refuses this session's traffic. That it keys on the
egress address is inferred: the refusal does not depend on client, user
agent, origin or video, and the address is the one thing these runs share.
[`wikimedia-rate-limits-the-session-egress.md`](./wikimedia-rate-limits-the-session-egress.md)
is the same kind of refusal from another vendor.

No setting in the app or the browser fixes it. Do not spend a round on
user agents, `youtube-nocookie.com` or `mute=1`.

## What a validator can verify instead

- **The blocked path, for free.** Every embed is blocked here, so the "Open
  on YouTube" fallback and its `watch?v=<id>&t=<start>` link are checkable as
  they are. The adapter maps 150 to `onBlocked`.
- **What the player is given.** Read the iframe's `src` with
  `agent-browser eval "document.querySelector('iframe[src*=youtube]').src"`.
  It carries `start`, `end`, `autoplay`, `playsinline` and `origin`.
- **"Set start here" and "Set end here".** They read
  `PassagePlayerControl.readCurrentSecond`, which asks the player for
  `getCurrentTime()`. Stub the iframe API before the page loads, so the
  player's time is yours to set:

  ```bash
  STUB='window.YT={Player:function(host,o){var t=o.playerVars.start;window.__ytStub={options:o,seek:function(s){t=s}};this.getCurrentTime=function(){return t};this.destroy=function(){};setTimeout(function(){o.events.onReady&&o.events.onReady({target:this})},0)}};window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady();'
  agent-browser --session v network route 'https://www.youtube.com/iframe_api' --body "$STUB"
  agent-browser --session v open <page>
  agent-browser --session v eval '__ytStub.seek(61)'   # then tap "Set start here": the field should read 61
  ```

  Measured on a test page: the stub loads in place of the real script,
  `getCurrentTime()` returns the `start` it was given (52), and 61 after
  `seek(61)`. `__ytStub.options.playerVars` is the full set of variables the
  app passed.
- **Out of reach here.** Whether a real video starts at the second given and
  pauses at its end, and autoplay on iOS. These need a preview opened on a
  real phone by the operator. Record them as UNVERIFIABLE and name this
  entry as the cause, not "the sandbox".
