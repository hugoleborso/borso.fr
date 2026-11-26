// @FollowsBlueprint utils-pure-module
import { type Check, type HookWorld, PASS, refuse, type Verdict } from '../check.core.ts';

const RULE = 'merge-strands-no-work';

function readOutputLines(world: HookWorld, args: readonly string[]): string[] | null {
  const result = world.run('git', args);
  if (result.status !== 0) return null;
  const output = result.stdout.replace(/\n+$/u, '');
  return output === '' ? [] : output.split('\n');
}

function locateCheckout(world: HookWorld, cwd: string | undefined): string | null {
  const directoryArgs = cwd === undefined ? [] : ['-C', cwd];
  const root = world.run('git', [...directoryArgs, 'rev-parse', '--show-toplevel']);
  return root.status === 0 ? root.stdout.replace(/\n+$/u, '') : null;
}

export const mergeStrandsNoWork: Check = {
  name: RULE,
  tools: /^mcp__github__merge_pull_request$/u,
  run(input, world): Verdict {
    const root = locateCheckout(world, input.cwd);
    if (root === null) return PASS;
    const tracked = readOutputLines(world, [
      '-C',
      root,
      'status',
      '--porcelain',
      '--untracked-files=no',
    ]);
    const stashed = readOutputLines(world, ['-C', root, 'stash', 'list']);
    if (tracked === null || stashed === null) return PASS;
    if (tracked.length === 0 && stashed.length === 0) return PASS;
    return refuse(RULE, 'merged with uncommitted or stashed work in the container', [
      'this container holds work no branch has, and it is reclaimed after the merge:',
      ...tracked.map((line) => `  changed: ${line}`),
      ...stashed.map((line) => `  stashed: ${line}`),
      "If it belongs to this pull request, commit it and push it to the pull request's branch.",
      'If it is for later, push it to a branch of its own, for example:',
      "  git stash branch claude/<slug>-wip && git commit -am 'wip' && git push -u origin claude/<slug>-wip",
      'The operator asks for that push here, so a session told to push to one branch only makes it too.',
      'A patch file in the scratchpad is not a way out: it is reclaimed with the container.',
      'Or drop it, with its own confirmation from the operator, then merge.',
    ]);
  },
};
