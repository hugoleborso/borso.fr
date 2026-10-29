---
summary: 'Deleting a GitHub environment needs Administration write, which no workflow `permissions:` key grants, and leaves its deployments behind.'
triggers:
  paths:
    - '.github/workflows/preview.yml'
  commands:
    - 'repos/[^ ]+/environments'
    - 'deleteAnEnvironment'
  output:
    - 'ENVIRONMENTS_ADMIN_TOKEN is not set'
---

# GitHub environments outlive their pull requests

Each preview deploy calls `createDeployment` with
`environment: preview-{app}-pr-{N}`, and GitHub creates the environment on
first use. Nothing removed them until PR #236, so 398 had piled up by
2026-10-29 and were deleted by hand.

Measured while fixing it:

- **`DELETE /repos/{owner}/{repo}/environments/{name}` needs the
  Administration: write repository permission** (fine-grained PAT table), or
  `repo` on a classic token. The workflow `permissions:` block has no
  `administration` key, so `GITHUB_TOKEN` can never do it. The teardown job
  reads a fine-grained PAT from the `ENVIRONMENTS_ADMIN_TOKEN` secret and
  warns and skips without it.
- **Deleting an environment does not delete its deployments.** After the
  purge, `GET /deployments?environment=preview-pragma-pr-98` still listed 8.
  That is why the teardown still marks each deployment `inactive`, before the
  delete.
- **A missing environment answers 404**, which the teardown treats as
  nothing to do. A PR that never deployed a preview therefore proves nothing
  about the token: PR #236's own teardown skipped all six names. The first
  real delete is the proof.
- **The cloud session's GitHub proxy refuses `/environments`** with HTTP 403,
  so a purge runs from a local session with `gh` (see
  [what-a-hosted-session-cannot-do-on-github.md](./what-a-hosted-session-cannot-do-on-github.md)).

## Reading GitHub's permission tables

`WebFetch` on docs.github.com returns a summary that drops the permission
tables, and the REST page for an endpoint does not name its fine-grained
permission at all. The markdown of any page is at
`https://docs.github.com/api/article/body?pathname=/en/<page path>`; the
table that maps every endpoint to its permission is
`/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens`.
