---
summary: 'A `CONNECT tunnel failed, response 403` is the cloud environment''s network policy refusing the host, not the host or auto mode refusing you. Read the policy with `get_environment` before blaming anything else.'
triggers:
  output:
    - 'CONNECT tunnel failed, response 403'
    - 'gateway answered 403 to CONNECT'
---

# A CONNECT 403 is the environment's network policy

The session proxy answers `403` to the `CONNECT` itself when the environment's
network policy does not allow the host. `curl` then prints
`curl: (56) CONNECT tunnel failed, response 403` and a status of `000`. The
request never left the container, so it says nothing about the host.
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` lists the refusal under
`recentRelayFailures` as `gateway answered 403 to CONNECT`.

## What happened on 2026-11-14

`get_environment` showed "Borso Admin" as *Limited* with no allowed host, while
"Borso.fr" was unrestricted. So in "Borso Admin" every host outside the package
registries and MCP servers answered 403: `<app>-pr-<n>.preview.borso.fr`,
`borso.fr` and `example.com` alike (measured). The session of PR #338 could not
run the `curl` check of the #310 backlog row, and proved the change from the
deployed CloudFront function instead.

The operator believed the environment had no blocked domain and first read the
403 as auto mode. Auto mode decides whether a tool call runs; these calls ran,
and the proxy refused the connection. On 2026-11-15 the operator set "Borso
Admin" to unrestricted, and the same three hosts answered 200 (measured).

## What to do

- Call `get_environment` and read `network`. `limited` with an empty
  `allowed_hosts` refuses every host but package registries and MCP servers.
- If the host is needed, ask the operator to change Network access in the
  environment's settings. A session can add one exact host with
  `update_environment`, never a wildcard such as `*.preview.borso.fr`.
- Until then, prove the change from the deployed resource with the AWS CLI, as
  #338 did.

## See also

- [`wikimedia-rate-limits-the-session-egress.md`](./wikimedia-rate-limits-the-session-egress.md), a 429 from the host itself, past the proxy.
- [`what-a-hosted-session-cannot-do-on-github.md`](./what-a-hosted-session-cannot-do-on-github.md), the 403s GitHub answers.
