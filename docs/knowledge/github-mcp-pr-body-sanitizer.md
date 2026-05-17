# GitHub MCP `create_pull_request` / `update_pull_request` body sanitizer quirks

The `mcp__github__*` tools (the GitHub MCP server provided by the
remote-execution harness, not the REST API directly) run incoming PR
bodies through a sanitizer that rewrites a few patterns silently.
Discovered on PR #23 over two iterations of editing the description.

## Patterns rewritten / stripped

1. **`<details>` and `<summary>` HTML tags are stripped entirely.**
   The text inside them survives, but the collapsible toggle is
   gone — every detail block ends up flattened into prose. The
   open-pr skill's progressive-disclosure template relies on
   `<details>`, so anything written through these tools renders as
   a long flat block.

2. **`![alt](url)` image markdown is wrapped in backticks.** A line
   like `![diagram](https://…/image.png)` becomes (literally, in
   the stored body) `` !`[diagram](https://…/image.png)` `` — the
   `!` survives, the rest is treated as inline code, and the image
   never embeds. Easy to mistake for "GitHub doesn't render images
   from this source"; it's actually the sanitizer.

3. **Pseudo-HTML tags inside backticks get stripped.** A documentation
   snippet like `` `<time>` `` (intended to discuss a GPX `<time>`
   element) becomes `` `` `` (empty backticks) because the
   sanitizer applies its HTML-tag-stripping pass even inside inline
   code spans. The same goes for `` `<trkpt>` ``, `` `<number>` ``,
   anything that looks like a tag.

## Workarounds

- For images: use **raw HTML `<img>` tags** instead of `![]()`. They
  survive the sanitizer.

  ```html
  <p><img src="https://raw.githubusercontent.com/.../shot.png"
          alt="screenshot" width="480" /></p>
  ```

- For tag-shaped substrings: drop the angle brackets. Rephrase
  `` `<time>` `` as `the `time` element`. Or escape as
  `` `&lt;time&gt;` `` — the entity passes through both passes
  intact.

- For collapsibles: there isn't a workaround through the MCP. You
  have to either accept the flat layout, or rewrite the body via a
  different surface (`gh pr edit` from a local shell, GitHub web
  UI). Neither is available from the remote-execution harness; in
  practice the kaizen-time advice is to write a flat body and
  separate sections with `#### Header` blocks instead of toggles.

## Confirmation procedure

To verify what was actually stored vs what was sent:

```bash
mcp__github__pull_request_read \
  method: get \
  owner: hugoleborso \
  repo: borso.fr \
  pullNumber: <n>
```

The `body` field in the response is the raw stored markdown — diff
it against what you intended to send.

## Why this matters

The remote-execution agent never sees the rendered PR — only the
markdown source. A sanitizer that silently rewrites markup means an
agent that "wrote a perfect description" can be looking at a
flattened or corrupted version on GitHub without ever knowing. PR #23
spent multiple round-trips iterating on the body because the
sanitizer's behaviour was not understood up-front.

## See also

- [`docs/dantotsus/orchestrator-shipped-with-stale-pr-description.md`](../dantotsus/orchestrator-shipped-with-stale-pr-description.md) — neighbour: PR-description ergonomics from a different angle (an orchestrator's stale snapshot, not a sanitizer's silent rewrite).
- [`docs/knowledge/escape-html-around-json-in-attributes.md`](./escape-html-around-json-in-attributes.md) — the same family of "HTML-attribute string-embedding" footgun, but inside a Leaflet `divIcon` rather than a PR body.
