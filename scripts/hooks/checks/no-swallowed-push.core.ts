// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse, type Verdict } from '../check.core.ts';
import { stripStringBodies } from '../shell-command.core.ts';

const RULE = 'no-swallowed-push';

const MUTATION_INTO_HEAD = /(stryker\s+run|test:mutation)(\s[^|]*)?\|\s*head(\s|$)/u;
const SKIPPED_GIT_HOOKS =
  /(^|\s)(HUSKY=0\s+)?git\s+(commit|push)(\s[^|]*)?\s--no-verify\b|HUSKY=0\s+git\s+(commit|push)\b/u;
const GIT_INTO_DEV_NULL = /(^|[|\s])git\s+(push|commit)(\s[^|]*)?>\s*\/dev\/null/u;
const PIPEFAIL_ON = /set -[a-zA-Z]*o\s+pipefail|set -o pipefail/u;
const GIT_INTO_PIPE = /(^|[|\s])git\s+(push|commit)(\s[^|]*)?\|/u;

const PIPEFAIL_CONTEXT =
  '[no-swallowed-push] The command ran with set -o pipefail in front, so a failed git exits non-zero. A later stage can too on its own: grep exits 1 when nothing matches, after a push that succeeded. Before calling a push failed, read git ls-remote origin <branch>.';

function hasLineMatching(lines: readonly string[], pattern: RegExp): boolean {
  return lines.some((line) => pattern.test(line));
}

export const noSwallowedPush: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input): Verdict {
    const command = input.tool_input?.['command'];
    if (typeof command !== 'string') return PASS;
    const commandToRun = stripStringBodies(command);
    const pipelines = commandToRun.replaceAll(/&&|;/gu, '\n').split('\n');
    if (hasLineMatching(pipelines, MUTATION_INTO_HEAD)) {
      return refuse(RULE, 'piped a mutation run into head, which kills it before the score', [
        'a mutation run piped into head is killed once head has its lines,',
        'with no error and no score, so it reads as a run that finished.',
        'Write the log to a file and read its end instead:',
        '  pnpm exec stryker run --mutate <files> > stryker.log 2>&1; tail -40 stryker.log',
      ]);
    }
    if (hasLineMatching(pipelines, SKIPPED_GIT_HOOKS)) {
      return refuse(RULE, 'skipped the git hooks with --no-verify or HUSKY=0', [
        '--no-verify and HUSKY=0 skip the git hooks, so their gates never report.',
        'Run the commit or push bare and fix what the hook reports.',
      ]);
    }
    if (hasLineMatching(pipelines, GIT_INTO_DEV_NULL)) {
      return refuse(RULE, 'sent git push or git commit errors to /dev/null', [
        "git's errors and every pre-commit or pre-push refusal go to stderr, and",
        '/dev/null throws them away; a command after ; then sets the exit status too.',
        'Keep the output where you can read it:',
        '  git push -u origin <branch> > push.log 2>&1; echo "push=$?"; tail -20 push.log',
      ]);
    }
    if (hasLineMatching(commandToRun.split('\n'), PIPEFAIL_ON)) return PASS;
    if (hasLineMatching(pipelines, GIT_INTO_PIPE)) {
      const updatedInput = { ...input.tool_input, command: `set -o pipefail; ${command}` };
      return { kind: 'rewrite', updatedInput, text: PIPEFAIL_CONTEXT };
    }
    return PASS;
  },
};
