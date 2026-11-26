// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse, type Verdict } from '../check.core.ts';
import { stripStringBodies } from '../shell-command.core.ts';

const RULE = 'no-broad-kill';
const NAME_KILL = /(^|[;&|\s])(pkill|killall|killall5)(\s|$)/mu;
const PGREP_INTO_XARGS_KILL = /pgrep[^|\n]*\|[^\S\n]*xargs[^\S\n]+(-\S+[^\S\n]+)*kill/u;
const BROWSER_CLOSE_ALL =
  /(^|[;&|\s])agent-browser([^\S\n]+[^;&|\n]*)?[^\S\n]close[^\S\n]+([^;&|\n]*[^\S\n])?--all(\s|$)/mu;

function refuseNameKill(reason: string): Verdict {
  return refuse(RULE, 'reached for pkill or killall on a machine other agents share', [
    reason,
    'This machine is shared with other agents and with long-running measurements.',
    'Main session, started it with run_in_background? Stop it with TaskStop and its task id.',
    'A dev server: scripts/dev-server.sh start <app>, then scripts/dev-server.sh stop <app>.',
    'It owns its process group, so stop takes pnpm, concurrently and every server they started, and nothing else.',
    'Any other process: kill the pid you started, never a name.',
  ]);
}

export const noBroadKill: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input) {
    const command = input.tool_input?.['command'];
    if (typeof command !== 'string') return PASS;
    const commandToRun = stripStringBodies(command);
    if (NAME_KILL.test(commandToRun)) {
      return refuseNameKill(
        "pkill / killall matches every process whose command line contains the pattern, including other agents'.",
      );
    }
    if (PGREP_INTO_XARGS_KILL.test(commandToRun)) {
      return refuseNameKill(
        'pgrep piped into xargs kill is pkill spelled differently, with the same blast radius.',
      );
    }
    if (!BROWSER_CLOSE_ALL.test(commandToRun)) return PASS;
    return refuse(RULE, 'reached for agent-browser close --all on a machine other agents share', [
      "agent-browser close --all closes every agent's browser session, not only yours.",
      'Close the session you opened: agent-browser --session <name> close, or agent-browser close for the default one.',
    ]);
  },
};
