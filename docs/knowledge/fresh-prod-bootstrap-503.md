# A freshly-deployed pragma prod returns 503 on every API route until you bootstrap the password

## Symptom

You deploy pragma to prod for the first time, open `pragma.borso.fr`,
and every API call 503s. CloudWatch on `/aws/lambda/pragma-prod-api`
shows:

```
<-- GET /api/bars
--> GET /api/bars 503 63ms
```

The Lambda is healthy — it boots, routes, returns fast. The 503 is
deliberate.

## Why

Pragma uses shared-password auth (ADR-0004). The password's argon2id
hash + the HMAC session-signing key live in a single `app_config` row
in the database. A fresh prod DB has **no** `app_config` row, so the
auth middleware returns `503 auth-not-bootstrapped` on every gated
route until the row exists.

> The `503` status is debatable — `412 Precondition Failed` would read
> truer — but the body `{ "error": "auth-not-bootstrapped" }` is the
> real signal. If you see a blanket 503 on fresh prod, you are not
> bootstrapped; you are not looking at a Lambda crash. (Confirm by
> checking the log: a crash shows a stack trace / `Runtime.Unknown`, a
> bootstrap-gate shows the clean `--> ... 503` line above.)

## Fix — bootstrap the password (once)

```bash
read -rsp "pragma prod password (>=8 chars): " PASS && echo
curl -sS -X POST https://pragma.borso.fr/api/admin/set-password \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$PASS\"}"
unset PASS
```

`read -rsp` keeps the secret off the screen and out of shell history.
The `set-password` endpoint is gated by "no row exists yet" — it
succeeds exactly once. After it returns 200, the 503s stop and
`/login` works with that password. Rotate later via the authenticated
`POST /api/admin/rotate-password` (which also rolls the HMAC key,
invalidating every existing session cookie).

## Notes that trip people up

- **In prod the API is same-origin**: `pragma.borso.fr/api/*` is routed
  by the app's CloudFront distribution to the API Lambda. There is **no**
  `pragma-api.borso.fr` subdomain — that hostname shape only exists for
  previews (`<app>-pr-<n>-api.preview.borso.fr`). See
  [`preview-api-cross-origin.md`](./preview-api-cross-origin.md).
- **Is POSTing the password "in clear" safe?** It travels inside the
  TLS body, same as every login/reset form on the web; no intermediate
  node sees it pre-decryption. Server-side it's never persisted in
  clear — the Hono `logger()` middleware logs only `method path
status`, never the body, and no API Gateway access-log / data-trace
  is enabled. The only clear-text exposure is your own terminal/browser
  at send time — hence `read -rsp`.
- **Seed order**: after bootstrap, create members → instruments → songs
  → sessions → setlist via the UI. There is no prod seed Lambda by
  design (first deploy ships an empty DB).
