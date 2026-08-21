const MESSAGE =
  'No comment in this repository. A comment is a smell of badly written code: replace it with a ' +
  'clearer name, failing that with better organisation — an extracted helper, a named constant, a ' +
  'type, a test — and only as a last resort with a document under `docs/`. A comment recording how ' +
  'the code changed over time belongs in `docs/dantotsus/` or `docs/knowledge/`, never beside the ' +
  'line. See docs/standards/12-linting-and-gates.md.';

const TAG_LINE_PATTERNS = [
  /^@Blueprint(Name|Usage|Description)?\s/,
  /^@FollowsBlueprint\s/,
  /^@Feature\s/,
  /^@DependsOnExternal\s/,
  /^@generated\b/,
  /^@(type|typedef|template|satisfies|import)\s/,
  /^globals?\s+[A-Za-z_$][\w$]*(\s*[,:]\s*(readonly|writable|off|true|false)?\s*[A-Za-z_$]?[\w$]*)*\s*$/,
  /^exported\s+[A-Za-z_$][\w$]*(\s*,\s*[A-Za-z_$][\w$]*)*\s*$/,
  /^@ts-(expect-error|ignore|nocheck)/,
  /^@vitest-environment\s/,
  /^SPDX-[A-Za-z-]+:/,
  /^\/\s*<reference\s/,
  /^prettier-ignore/,
  /^[cv]8 ignore/,
  /^istanbul ignore/,
];

const DIRECTIVE_WITH_REASON_PATTERNS = [/^eslint-(disable|enable)/, /^Stryker (disable|restore)/];

function significantLines(comment) {
  const raw = comment.type === 'Line' ? [comment.value] : comment.value.split('\n');
  return raw
    .map((line, offset) => ({ text: line.replace(/^\s*\*+\s?/, '').trim(), offset }))
    .filter((line) => line.text !== '');
}

function isTagLine(text) {
  return TAG_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function isDirectiveLine(text) {
  return DIRECTIVE_WITH_REASON_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * @Blueprint lint-rule-predicate-comment
 * @BlueprintName Machine Read Comment Predicate
 * @BlueprintUsage Use to tell an annotation a generator parses from a comment a person wrote for a person.
 * @BlueprintDescription Answers from the comment body alone, with no file name or node context, so the rule and its suite ask exactly the same question. A block headed by a directive passes whole, because an eslint or Stryker directive carries a free text reason that prettier is free to wrap onto the following lines. Every other block passes only when every non empty line is a tag, which is why a `@Blueprint` block passes and a block pairing one tag with a sentence of prose does not.
 */
export function isMachineReadComment(comment) {
  const lines = significantLines(comment);
  if (lines.length === 0) {
    return false;
  }
  if (isDirectiveLine(lines[0].text)) {
    return true;
  }
  return lines.every((line) => isTagLine(line.text));
}

/**
 * @Blueprint lint-rule-precise-report
 * @BlueprintName Line Precise Comment Report
 * @BlueprintUsage Use when a rule reports on a construct that spans lines and only some of them are at fault.
 * @BlueprintDescription Returns the offset of every prose line inside the comment rather than the comment itself, so a report names the lines to delete and never the machine read tags beside them. Reporting the whole range instead is what let a sweep keyed on the reported location take a `@Blueprint` block and a `@DependsOnExternal` tag out with the prose that shared their block.
 */
export function proseLineOffsets(comment) {
  const lines = significantLines(comment);
  if (lines.length === 0) {
    return [0];
  }
  if (isDirectiveLine(lines[0].text)) {
    return [];
  }
  return lines.filter((line) => !isTagLine(line.text)).map((line) => line.offset);
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
          if (comment.type === 'Shebang') {
            continue;
          }
          for (const offset of proseLineOffsets(comment)) {
            context.report({
              loc: { line: comment.loc.start.line + offset, column: 0 },
              messageId: 'noComment',
            });
          }
        }
      },
    };
  },
};
