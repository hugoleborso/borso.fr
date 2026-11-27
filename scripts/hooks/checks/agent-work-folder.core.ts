// @FollowsBlueprint utils-pure-module
import { type Check, PASS } from '../check.core.ts';

const SCRATCHPAD_WORK_FOLDER =
  /\/tmp\/claude-[0-9]+\/[^/\s]+\/[^/\s]+\/scratchpad\/[A-Za-z0-9_][A-Za-z0-9._-]*/gu;

export function listWorkFolders(prompt: string): string[] {
  return [...new Set(prompt.match(SCRATCHPAD_WORK_FOLDER))].toSorted();
}

export const agentWorkFolder: Check = {
  name: 'agent-work-folder',
  tools: /^(Agent|Task)$/u,
  run: (input, world) => {
    const prompt = input.tool_input?.['prompt'];
    if (typeof prompt !== 'string') return PASS;
    const folders = listWorkFolders(prompt);
    if (folders.length > 0) world.run('mkdir', ['-p', ...folders]);
    return PASS;
  },
};
