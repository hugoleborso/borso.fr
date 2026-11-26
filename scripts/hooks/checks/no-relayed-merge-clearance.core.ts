// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse, type Verdict } from '../check.core.ts';

const RULE = 'no-relayed-merge-clearance';

const CLEARANCE =
  /(operator|hugo|hugoleborso|user|he|they)[^.]{0,40}\b(says?|said|asks?|asked|approves?|approved|cleared|wants?|ok(ay)?s?|green-?lights?)\b[^.]{0,60}\bmerg(e|ing)\b|\b(go ahead and|please|you (may|can|are cleared to)|cleared to|ok(ay)? to)\s+merge\b|\bmerge (it|this|the (pull request|pr)|#?[0-9]+)[^.]{0,20}\bnow\b/iu;

export const noRelayedMergeClearance: Check = {
  name: RULE,
  tools: /^mcp__claude-code-remote__send_message$/u,
  run(input): Verdict {
    const message = input.tool_input?.['message'];
    if (typeof message !== 'string') return PASS;
    if (!CLEARANCE.test(message.replaceAll('\n', ' '))) return PASS;
    return refuse(
      RULE,
      "relayed the operator's merge clearance to another session instead of merging",
      [
        'refused: this message hands a merge clearance to another session.',
        "It lands there as a peer's message, which that session may not merge on, so the operator has to ask again.",
        "The operator's instruction is yours. Merge the pull request here with mcp__github__merge_pull_request.",
        'The merge hooks check checks, the moved base and the blast radius the same way from any session.',
        'To tell the owning session after the merge, send what happened, not a clearance.',
      ],
    );
  },
};
