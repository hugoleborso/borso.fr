# Visual validation: a member connects an assistant to pragma

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/pragma-assistants-mcp` at `c677660c` (includes the fix `b23c3708` for the previous run's FAIL)
- Previous run: [`visual-validation-2026-10-27-1403.md`](./visual-validation-2026-10-27-1403.md), FAIL on row 15
- Dev URL: http://localhost:5174/ (`pnpm --filter @borso-app/pragma dev`, API on 3001, dev fixture, password `pragma-preview`)
- Run at: 2026-10-27T14:40:00Z
- Tooling: agent-browser 0.35.2 through `scripts/browser.sh` (layout, clicks, 1280 and 375 px); `scripts/argent.sh touch` (real touch at 375 x 812, `Input.dispatchTouchEvent`); `curl` for the OAuth and MCP calls a client makes; a loopback listener on `http://localhost:53682/callback` standing in for the assistant's callback
- Dispatch: the stage ran without an `Agent` tool, so this report was written by the workflow stage agent `visual-validation-02` following `plugins/borso-harness/agents/visual-validator.md`, with no implementation context beyond the spec and the previous report

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Account page has a "Connect an assistant" section with three copyable blocks: Claude Code, Mistral Vibe, claude.ai / Le Chat | Sign in as Hugo, open `/account`, scroll to the section at 1280 px | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/04-account-assistants-1280.png` | PASS |
| 02 | Result | Claude Code block reads `claude mcp add --transport http --scope user pragma <origin>/mcp`, then "/mcp" and "Authenticate" | Read section text | text = `claude mcp add --transport http --scope user pragma http://localhost:5174/mcp` + "Run this in a terminal, then type /mcp in Claude Code and choose “Authenticate”." | PASS |
| 03 | Result | Vibe block is the `[[mcp_servers]]` TOML with `transport = "streamable-http"`, `[mcp_servers.auth] type = "oauth"`, `scopes = ["pragma"]`, for `~/.vibe/config.toml` | Read section text | text matches the spec block line for line with the local origin, + "Add this to ~/.vibe/config.toml." | PASS |
| 04 | Result | claude.ai / Le Chat block: Settings → Connectors → Add custom connector → `<origin>/mcp` | Read section text | text = `http://localhost:5174/mcp` + "Settings → Connectors → Add custom connector, then paste this address." | PASS |
| 05 | Result | The blocks are copyable | Click each Copy with `navigator.clipboard.writeText` recorded (agent-browser, 1280 px); touch the first Copy (argent, 375 px) | recorded writes = the three snippets verbatim; argent `isRealTouch: true`, write = the Claude Code command, "Copied" shown | PASS |
| 06 | Result | "Connected assistants" lists each grant as `<client> · since <date> · last used <ago>` with Revoke | Run the OAuth flow, call `tools/list` with the token, open `/account` | "Claude Code since Oct 27 · last used this minute · Revoke", plus the dev fixture's seeded grant "last used 4 minutes ago" | PASS |
| 07 | Result | Consent page at `/oauth/consent` after sign-in: "Claude Code wants to act on pragma as Hugo. It will be able to do everything you can do in the app." with Allow and Deny | Register a client, open `/oauth/authorize?…`, sign in | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/02-consent-1280.png`; text verbatim | PASS |
| 08 | Happy path 2 / Result | Consent is reached after the member signs in, if not already | Open authorize while signed out, sign in | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/01-signed-out-authorize-lands-on-login.png`; URL after sign-in = `/oauth/consent?…&state=xyz123` with every parameter kept | PASS |
| 09 | Test strategy | Deny redirects correctly | Click Deny at 375 px | callback received `/callback?error=access_denied&state=xyz123` | PASS |
| 10 | Test strategy | Allow redirects correctly | Click Allow at 1280 px (agent-browser); touch Allow at 375 px (argent) | callback received `/callback?code=…&state=xyz123` and `…&state=touch1`; each code exchanged at `/oauth/token` for a 3600 s access token and a refresh token | PASS |
| 11 | Test strategy | Consent page at 375 px and 1280 px | Viewport 375 x 812 and 1280 x 800 | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/03-consent-375.png`; scrollWidth 375 = clientWidth; Allow and Deny 293 x 44 px | PASS |
| 12 | Test strategy | Account section at 375 px and 1280 px | Viewport 375 x 812 | `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/06-account-assistants-375.png`; no element past 375 px; each `pre` wraps (scrollWidth 307 = clientWidth 307) | PASS |
| 13 | Edge case / Test strategy | Revoking on the Account page deletes the grant; the next call answers 401 | Click Revoke on the fresh grant; call `/mcp` and `/oauth/token` with its tokens; reload | row gone after reload, seeded grant kept; `/mcp` → 401 with `WWW-Authenticate: Bearer resource_metadata=…`; refresh → `invalid_grant`; `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/05-after-revoke-1280.png` | PASS |
| 14 | Edge case | Revoke works with a thumb at phone width | argent `touch 'button[aria-label="Revoke Claude Code"]'` on a grant made after the password change | `isRealTouch: true`; list then reads "No assistant connected yet."; that grant's `/mcp` call → 401; `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/08-revoke-touch-argent.png` | PASS |
| 15 | Edge case | A member whose credential changes loses every grant | Allow a grant, `tools/list` → 200; change Hugo's password on `/account`; call `/mcp`, refresh, reload `/account` | `/mcp` → 401; refresh → `invalid_grant`; "Connected assistants" reads "No assistant connected yet.", both the fresh and the seeded grant gone, 0 Revoke buttons after reload; `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/07-grants-gone-after-password-change.png` | PASS |
| 16 | Happy path 3 | Claude Code lists pragma's tools; "add Seven Nation Army to Saturday's setlist" calls `search_songs` then `add_setlist_entry` | `tools/list`, `search_songs`, `create_song`, `add_setlist_entry` with the Bearer token, then open the setlist | 87 tools listed; entry at position 6 "Seven Nation Army" shows on `/setlists/<id>`: `https://screenshots-pr-<n>.preview.borso.fr/2026-10-27-1440/09-setlist-shows-mcp-entry.png` | PASS |
| 17 | Input metric 3 | A song created through the MCP appears in the catalogue | `create_song`, then open `/` | catalogue text contains "Seven Nation Army" | PASS |
| 18 | Happy path 4 / Edge case | Other members get the push, the member who asked is not | none possible here | no push subscription can be held by a headless browser in this sandbox | UNVERIFIABLE |
| 19 | Edge case | Redirect URIs must be https or loopback http on any port | `POST /oauth/register` with three URIs | `http://evil.example/cb` → 400; `http://127.0.0.1:9999/cb` → 201; `https://claude.ai/…` → 201 | PASS |
| 20 | Edge case | PKCE `plain` is refused | authorize with `code_challenge_method=plain` | 302 to `callback?error=invalid_request&state=s` | PASS |
| 21 | Edge case | Refresh rotates on use; replaying an old one revokes the whole grant | refresh once, replay the first token, then use the second | rotate → new tokens; replay → `invalid_grant`; the rotated token → `invalid_grant` | PASS |
| 22 | Edge case | `request_take_upload` returns a presigned PUT, then `create_take` | none run | needs the S3 bucket; the local stack has none | UNVERIFIABLE |
| 23 | Edge case | Deleting a member deletes their grants | none run | deferred to the back-end e2e suite, see the technical validation report | UNVERIFIABLE |
| 24 | Edge case | Previews: per-stage signing, grants kept out of the clone | none run | needs a deployed preview | UNVERIFIABLE |
| 25 | Error case | Unknown tool or schema error returns an MCP error naming the field, never a 500 | `tools/call no_such_tool`; `create_song {title: 42}` | HTTP 200, `isError: true`, "Tool no_such_tool not found"; "Expected string, received number at title / Required at status" | PASS |
| 26 | Error case | Service refusal returned as a tool error with the route's code | `get_song` with an unknown id | `isError: true`, `{"error":"not-found"}` | PASS |
| 27 | Error case | More than 10 registrations per hour from one address answer 429 | 16 registrations from one address within the hour | registrations 1 to 10 → 201 or 400; 11 onward → 429 | PASS |

Every screenshot was followed by the broken-image scan; each returned `[]`. `scripts/browser.sh errors` was empty on the consent page.

## Notes

- **15, the previous FAIL, now PASS.** The run before this one (`visual-validation-2026-10-27-1403`) saw the dead grant still listed after a password change. On `c677660c` the change of password ends the access token (401), the refresh token (`invalid_grant`) and the Account list at once, and a grant allowed after the change works and is listed normally (row 14 was run on such a grant).
- **10, touch on Allow.** argent's probe on Allow again returned `isRealTouch: false` with "no touchstart reached the target", while the callback received the code from that tap. Allow navigates away, so the probes leave with the page; the row passes on the observed redirect, and the touch rows that stay on the page (05, 14) report `isRealTouch: true`. Logged to the kaizen file.
- **18 UNVERIFIABLE.** Push delivery and the skip of the acting member cannot be seen in a headless browser.
- **22, 23, 24 UNVERIFIABLE.** Back-end or deployment behaviour with no screen: the S3 upload needs a bucket, member deletion and preview isolation are covered by the back-end e2e suite and the CDK tests.
- **Not re-run here:** the French strings of the consent page and the grant list, which passed in the previous run and which the fix did not touch.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
