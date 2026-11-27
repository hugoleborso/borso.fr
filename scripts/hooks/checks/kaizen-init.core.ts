// @FollowsBlueprint utils-pure-module
import { type Check, PASS } from '../check.core.ts';

export const kaizenInit: Check = {
  name: 'kaizen-init',
  tools: null,
  run(_input, world) {
    const result = world.run(`${world.projectDirectory}/scripts/kaizen.sh`, ['init']);
    const text = result.status === 0 ? result.stdout : `${result.stdout}${result.stderr}`;
    return text === '' ? PASS : { kind: 'context', text };
  },
};
