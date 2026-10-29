# ADR-0042: pragma is its own OAuth 2.1 authorization server, and an assistant signs in through the member's existing session

- **Status:** accepted
- **Date:** 2026-10-23
- **Deciders:** Hugo Borsoni
- **Tags:** assistants-act-on-pragma, security, data

## Context

The operator chose a browser login over a personal token for connecting assistants to pragma ([spec](../features/pragma/assistants-act-on-pragma/spec/spec.md)). Claude Code finds an authorization server through RFC 9728 protected resource metadata and RFC 8414 server metadata, registers itself with dynamic client registration, and completes an authorization code flow with PKCE on a loopback redirect it chooses. Mistral Vibe does the same with `auth.type = "oauth"` and a default callback port of 47823. claude.ai and Le Chat connectors need OAuth too.

pragma already has an identity for each member: a per-member credential, optionally a passkey, and a signed session cookie whose validity `judgeMemberSession` ties to the credential ([ADR-0015](./0015-per-member-credentials-replace-the-shared-password.md), [ADR-0016](./0016-simplewebauthn-carries-the-passkey-flow.md)). Previews clone production ([ADR-0009](./0009-pragma-previews-clone-production.md)).

## Decision

**pragma's API serves the authorization endpoints itself.** It serves `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, `/oauth/register`, `/oauth/authorize`, `/oauth/token` and `/oauth/revoke`. Their request and response shapes reuse the Zod schemas the MCP SDK exports for OAuth metadata and client registration. `/oauth/authorize` requires the existing member session and sends the member through the normal sign-in first, then to a consent page. Clients are public and use PKCE with S256 only. Redirect URIs must be https, or loopback on any port. Codes live 60 seconds. Access tokens are opaque and live one hour. Refresh tokens live 90 days and rotate on every use, and replaying one revokes the grant. Every secret is stored as a SHA-256 hash. A grant records the credential version, so a password change ends it, as it ends cookies. Grant and code tables are blocklisted from preview clones.

## Consequences

- `+` Members sign in with the pragma password or passkey they already use. There is no second identity to create, map or delete.
- `+` No vendor, no new secret, and no member data leaves pragma's own database.
- `+` The same flow serves Claude Code, Vibe, claude.ai and Le Chat.
- `-` We own security-critical code. It carries the 100% coverage and mutation gates, and the e2e suite drives the flow, but no external audit has looked at it.
- `-` Dynamic client registration is an open endpoint. It is rate limited per address, and clients unused for 30 days are swept.
- `-` Opaque tokens cost one database read per MCP call. This is acceptable at five or six members and has not been measured.

## Alternatives considered

### Option A — Minimal authorization server in the API (chosen)

- **Summary:** as in *Decision*.
- **Strengths:** reuses the member identity and session; nothing new to deploy.
- **Costs:** a few hundred lines of protocol code and three tables.
- **Rationale:** it is the only option where a member's identity stays the pragma credential, which is the high-weight criterion.

### Option B — `oidc-provider` (panva) (rejected)

- **Summary:** a certified OpenID provider, mounted in Hono through a Node bridge, with a storage adapter written for DSQL.
- **Strengths:** certified protocol code.
- **Costs:** Koa on Lambda behind Hono, an adapter for every model it stores, and far more surface (OIDC, sessions, interactions) than the four endpoints the clients use.
- **Rejection rationale:** it loses on fit and on the code we would still write. It would win if pragma ever became an identity provider for other applications.

### Option C — Hosted provider: Auth0, WorkOS AuthKit or Cognito (rejected)

- **Summary:** delegate login and registration to a vendor. WorkOS and Auth0 both document dynamic client registration for MCP. Auth0 ships it disabled by default, with free-tier entity limits it does not publish. Whether Cognito supports it was not verified.
- **Strengths:** protocol and security maintained by the vendor.
- **Costs:** a second identity per member at the vendor, mapped back to the pragma member; a new vendor and a new secret; member e-mail addresses held by a third party.
- **Rejection rationale:** it loses on identity. Members would sign in to something that is not pragma, and the mapping becomes a new source of bugs. It would win if pragma had many users or needed enterprise single sign-on.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| One identity per member | high | The credential and session model of ADR-0015 is the security boundary; a second identity doubles it. |
| Vendors and secrets added | high | Each is an ADR trigger and an operator step per stage. |
| Protocol code we own | medium | Security code we write needs the strongest gates in the repository. |
| Fit with the four clients | medium | Discovery, dynamic registration, PKCE and loopback redirects are all required. |

|   | A: in the API | B: oidc-provider | C: hosted |
|---|---|---|---|
| One identity | ✓ pragma credential | ✓ pragma credential via an adapter | ✗ vendor account per member |
| Vendors, secrets | ✓ none | ✓ none | ✗ one vendor, one secret |
| Code we own | ✗ the endpoints | ✗ the adapter and bridge | ✓ almost none |
| Fit | ✓ exactly the endpoints needed | ✗ much more than needed | ✓ documented for MCP |

## Implementation pointers

- Spec: [`docs/features/pragma/assistants-act-on-pragma/spec/spec.md`](../features/pragma/assistants-act-on-pragma/spec/spec.md)
- Plan: to be written by `/technical-conception`
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/api/src/oauth/`, `apps/pragma/api/src/auth/member-session.core.ts`, `apps/pragma/cdk/lib/stack.ts`
- Related ADRs: builds on ADR-0009, ADR-0015, ADR-0016; used by ADR-0041
