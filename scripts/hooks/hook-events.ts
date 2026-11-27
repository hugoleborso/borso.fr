// @FollowsBlueprint core-lookup-table
import type { Check, HookEvent } from './check.core.ts';
import { agentAfterRoute } from './checks/agent-after-route.core.ts';
import { agentWorkFolder } from './checks/agent-work-folder.core.ts';
import { apiChangeNeedsValidation } from './checks/api-change-needs-validation.core.ts';
import { emptyChecksMeansConflict } from './checks/empty-checks-means-conflict.core.ts';
import { eslintCacheReplaysAFixedError } from './checks/eslint-cache-replays-a-fixed-error.core.ts';
import { formatWrite } from './checks/format-write.core.ts';
import { ghPrCreate } from './checks/gh-pr-create.core.ts';
import { githubPrBody } from './checks/github-pr-body.core.ts';
import { kaizenInit } from './checks/kaizen-init.core.ts';
import {
  knowledgeTriggersAfterTool,
  knowledgeTriggersBeforeTool,
  knowledgeTriggersOnFailure,
} from './checks/knowledge-triggers.core.ts';
import { lintWrite } from './checks/lint-write.core.ts';
import { mergeDeploysProd } from './checks/merge-deploys-prod.core.ts';
import { mergeStrandsNoWork } from './checks/merge-strands-no-work.core.ts';
import { mockupCopy } from './checks/mockup-copy.core.ts';
import { mockupReadsVisualRules } from './checks/mockup-reads-visual-rules.core.ts';
import { noBroadKill } from './checks/no-broad-kill.core.ts';
import { noDiscardingReset } from './checks/no-discarding-reset.core.ts';
import { noHandDrawnArt } from './checks/no-hand-drawn-art.core.ts';
import { noPrettier } from './checks/no-prettier.core.ts';
import { noRelayedMergeClearance } from './checks/no-relayed-merge-clearance.core.ts';
import { noSharedCheckoutSwitch } from './checks/no-shared-checkout-switch.core.ts';
import { noSwallowedPush } from './checks/no-swallowed-push.core.ts';
import { noTestDoubleDash } from './checks/no-test-double-dash.core.ts';
import { notificationGetsNoReply } from './checks/notification-gets-no-reply.core.ts';
import { onePullRequestPerSession } from './checks/one-pull-request-per-session.core.ts';
import { screensShown } from './checks/screens-shown.core.ts';
import { sessionEnv } from './checks/session-env.core.ts';
import { sessionStart } from './checks/session-start.core.ts';
import { specBriefRunsASkill } from './checks/spec-brief-runs-a-skill.core.ts';
import { subagentNoStaging } from './checks/subagent-no-staging.core.ts';
import { validationRunsAsItsAgent } from './checks/validation-runs-as-its-agent.core.ts';

export const CHECKS_BY_EVENT: Readonly<Record<HookEvent, readonly Check[]>> = {
  PreToolUse: [
    mergeDeploysProd,
    ghPrCreate,
    apiChangeNeedsValidation,
    noBroadKill,
    noTestDoubleDash,
    noPrettier,
    noSwallowedPush,
    noDiscardingReset,
    noSharedCheckoutSwitch,
    subagentNoStaging,
    githubPrBody,
    validationRunsAsItsAgent,
    knowledgeTriggersBeforeTool,
    noHandDrawnArt,
    mergeStrandsNoWork,
    onePullRequestPerSession,
    agentWorkFolder,
    agentAfterRoute,
    specBriefRunsASkill,
    noRelayedMergeClearance,
    mockupReadsVisualRules,
    mockupCopy,
  ],
  PostToolUse: [
    formatWrite,
    lintWrite,
    emptyChecksMeansConflict,
    eslintCacheReplaysAFixedError,
    knowledgeTriggersAfterTool,
    notificationGetsNoReply,
  ],
  PostToolUseFailure: [eslintCacheReplaysAFixedError, knowledgeTriggersOnFailure],
  Stop: [screensShown],
  SessionStart: [sessionStart, sessionEnv, kaizenInit],
};
