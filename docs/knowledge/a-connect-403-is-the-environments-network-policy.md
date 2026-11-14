---
summary: 'A `CONNECT tunnel failed, response 403` is the cloud environment''s network policy refusing the host, not the host refusing you. "Borso Admin" allows no extra host, so preview hosts answer 403 there; run a preview check from a "Borso.fr" session.'
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

## The two borso.fr environments differ

Measured with `get_environment` on 2026-11-14:

| Environment | Network | AWS identity |
| --- | --- | --- |
| "Borso.fr" | unrestricted | `AI-Dev-ReadOnly` (`docs/aws-setup.md` §12.3) |
| "Borso Admin" | limited, no allowed host | `Borso-Admin` (`docs/aws-setup.md` §12.8) |

So in "Borso Admin" every `<app>-pr-<n>.preview.borso.fr` host answers 403.
The session of PR #338 could not run the `curl` check of the #310 backlog row
for that reason, and proved the change from the deployed CloudFront function
instead. A curl to `pragma-pr-343.preview.borso.fr` from this sweep's
"Borso Admin" session answered the same 403 (measured).

## What to do

- Call `get_environment` to see which environment the session runs in.
- Check a preview from a "Borso.fr" session, or prove the change from the
  deployed resource with the AWS CLI, as #338 did.
- A host can only be allowed one exact name at a time from a session, and
  preview hosts change per pull request. Allowing `*.preview.borso.fr` is a
  wildcard, which only the operator can add in the environment's settings.

## See also

- [`wikimedia-rate-limits-the-session-egress.md`](./wikimedia-rate-limits-the-session-egress.md), a 429 from the host itself, past the proxy.
- [`what-a-hosted-session-cannot-do-on-github.md`](./what-a-hosted-session-cannot-do-on-github.md), the 403s GitHub answers.
