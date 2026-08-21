const MESSAGE =
  'No comment in this repository. A comment is a smell of badly written code: replace it with a ' +
  'clearer name, failing that with better organisation — an extracted helper, a named constant, a ' +
  'type, a test — and only as a last resort with a document under `docs/`. A comment recording how ' +
  'the code changed over time belongs in `docs/dantotsus/` or `docs/knowledge/`, never beside the ' +
  'line. See docs/standards/12-linting-and-gates.md.';

const MACHINE_READ_LINE_PATTERNS = [
  /^@Blueprint(Name|Usage|Description)?\s/,
  /^@FollowsBlueprint\s/,
  /^@Feature\s/,
  /^@DependsOnExternal\s/,
  /^@(type|typedef|template|satisfies|import)\s/,
  /^eslint-(disable|enable)/,
  /^globals?\s+[A-Za-z_$][\w$]*(\s*[,:]\s*(readonly|writable|off|true|false)?\s*[A-Za-z_$]?[\w$]*)*\s*$/,
  /^exported\s+[A-Za-z_$][\w$]*(\s*,\s*[A-Za-z_$][\w$]*)*\s*$/,
  /^@ts-(expect-error|ignore|nocheck)/,
  /^@vitest-environment\s/,
  /^SPDX-[A-Za-z-]+:/,
  /^\/\s*<reference\s/,
  /^prettier-ignore/,
  /^[cv]8 ignore/,
  /^istanbul ignore/,
  /^Stryker (disable|restore)/,
];

function commentLines(comment) {
  const raw = comment.type === 'Line' ? [comment.value] : comment.value.split('\n');
  return raw.map((line) => line.replace(/^\s*\*+\s?/, '').trim()).filter((line) => line !== '');
}

/**
 * @Blueprint lint-rule-predicate-comment
 * @BlueprintName Machine Read Comment Predicate
 * @BlueprintUsage Use to tell an annotation a generator parses from a comment a person wrote for a person.
 * @BlueprintDescription Answers from the comment body alone, with no file name or node context, so the rule and its suite ask exactly the same question. A comment survives only when every non-empty line matches one of the module level patterns, which is why a `@Blueprint` block passes whole and a block mixing one tag with a sentence of prose does not.
 */
export function isMachineReadComment(comment) {
  const lines = commentLines(comment);
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line) => MACHINE_READ_LINE_PATTERNS.some((pattern) => pattern.test(line)));
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Allow only machine-read annotations as comments.' },
    schema: [],
    messages: { noComment: MESSAGE },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Shebang' || isMachineReadComment(comment)) {
            continue;
          }
          context.report({ loc: comment.loc, messageId: 'noComment' });
        }
      },
    };
  },
};
