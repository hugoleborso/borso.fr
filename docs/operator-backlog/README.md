# Operator backlog

Tasks that need a right no session holds. Only the operator can do them.

A task belongs here only when the session that found it could not do it,
because it needed one of these:

- AWS write or IAM. Sessions run as `AI-Dev-ReadOnly`, and `iam:*` is denied.
  A session in the "Borso Admin" environment runs as `Borso-Admin` and can do
  these tasks (`docs/aws-setup.md` §12.8). Before its first IAM call, it asks the
  operator one closed question that names the policy, the principal and the
  actions. Auto mode refused the IAM writes of #338 twice on a broad go-ahead,
  and let them through once the operator named the change (measured).
- GitHub repository settings, environments, variables, secrets, tokens or app
  installs.
- A dispatch only the operator makes, such as `shared-deploy`.
- A third-party console or the operator's own account or devices.

A code change, a product decision, a review or a merge is not a task here.

One file per task, so two pull requests that each add one never touch the
same file. The session that finds a task adds `<slug>.md` beside this README,
in the pull request that found it, with this front matter:

```
---
status: open
found-in: '#<pull request>'
right: '<the right it needs>'
---
```

then the task and a `## Done when` section naming the check that proves it.

The operator does not read these files. A session in the "Borso Admin"
environment does the open tasks when asked. It sets `status: done`, `dropped`
or `refuted` and `closed: <date>`, and adds an `## Evidence` section with what
it measured.

List the open tasks with `grep -l '^status: open' docs/operator-backlog/*.md`.
