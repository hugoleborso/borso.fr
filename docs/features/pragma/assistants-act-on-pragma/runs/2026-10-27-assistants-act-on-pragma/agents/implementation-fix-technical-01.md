---
status: done
summary: Fixed the three technical-validation blockers. TV-PREVIEW-INSTALL-URL (d992239a) builds the MCP address from VITE_API_BASE, falling back to the page origin. TV-REPLAY-OLDER-TOKEN and TV-DSQL-CLAIM-CONFLICT (a6026bbf) make refresh tokens <family>.<secret> with refresh_family_hash replacing previous_refresh_token_hash in the unshipped migration 0020, so any old token of the family revokes the grant, and the code claim and rotation answer invalid_grant on a conflict abort.
next: { kind: validate }
artifacts:
  - apps/pragma/site/src/lib/assistant-install.utils.ts
  - apps/pragma/site/src/lib/assistant-install.utils.test.ts
  - apps/pragma/site/src/lib/api.client.ts
  - apps/pragma/site/src/components/organisms/AssistantConnections.tsx
  - apps/pragma/api/src/database/migrations/0020_assistant_grants.sql
  - apps/pragma/api/src/oauth/oauth.schema.ts
  - apps/pragma/api/src/oauth/oauth.schema.test.ts
  - apps/pragma/api/src/oauth/oauth.types.ts
  - apps/pragma/api/src/oauth/oauth.repository.ts
  - apps/pragma/api/src/oauth/token.core.ts
  - apps/pragma/api/src/oauth/token.core.test.ts
  - apps/pragma/api/src/oauth/token.service.ts
  - apps/pragma/api/src/oauth/oauth.controller.test.ts
  - apps/pragma/api/src/__test/test-seed.service.ts
  - apps/pragma/VOCABULARY.md
  - docs/features/pragma/assistants-act-on-pragma/plan/plan.md
---

Tests that failed before the fix: assistant-install.utils.test.ts (preview API host), oauth.controller.test.ts "revokes the grant when a token two rotations old is replayed after a thief refreshed twice", "answers invalid_grant, never a 500, when the code claim loses a commit conflict", "answers invalid_grant, never a 500, when the rotation loses a commit conflict" (conflict simulated with abortCommitsWritingTable). Two race tests fire two exchanges and two refreshes at once and assert one 200 and one 400.

Gates: eslint --max-warnings 0 and prettier --check on changed files; tsc --noEmit; test:core 2746 passed with coverage; back-e2e 378 passed; Stryker --mutate token.core.ts and assistant-install.utils.ts at 100%; knip clean; pre-commit (blueprints, vocabulary, DSQL migration check) green.
