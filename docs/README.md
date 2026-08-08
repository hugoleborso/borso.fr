# docs/

Operational + architectural docs for the `borso.fr` monorepo. Read [`/CLAUDE.md`](../CLAUDE.md) first for conventions; this folder covers the *why* and the *how*.

| File | What's in it |
| --- | --- |
| [`architecture.md`](./architecture.md) | What runs where, AWS regions, scaling-to-zero invariants, cost target. |
| [`flows.md`](./flows.md) | Preview deploy, production deploy, shared-infra deploy, budget alarm, resource lifecycles. |
| [`aws-setup.md`](./aws-setup.md) | One-time manual setup: account hardening, Identity Center, CDK bootstrap, GitHub Environments, Variables, deploying `infra/shared/` for the first time. |
| [`local-dev.md`](./local-dev.md) | Local toolchain, SessionStart hook, husky hooks, common commands, when to `--no-verify`. |
| [`adding-an-app.md`](./adding-an-app.md) | Checklist for landing a new app. |
