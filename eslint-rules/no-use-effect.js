import { isSiteFile } from './site-paths.js';

const MESSAGE =
  'No front end in this repository contains a `useEffect`. Compute during render for derived ' +
  'state, do the work in the event handler for a user action, use CSS for a media query or an ' +
  'animation, and use `useSyncExternalStore` for a value that lives outside React. When the ' +
  'effect is genuinely synchronising with an external system, disable this rule on the line ' +
  'and name the system. See docs/standards/07-state-and-effects.md.';

const HOOK_NAME = 'useEffect';
const REACT_NAMESPACE = 'React';

export function isUseEffectCallee(callee) {
  if (callee.type === 'Identifier') {
    return callee.name === HOOK_NAME;
  }
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === REACT_NAMESPACE &&
    callee.property.type === 'Identifier' &&
    callee.property.name === HOOK_NAME
  );
}

/**
 * @Blueprint lint-rule
 * @BlueprintName Custom Lint Rule
 * @BlueprintUsage Use for a rule in the `borso` plugin that enforces one document in `docs/standards/`.
 * @BlueprintDescription Carries no file header, because the argument for the rule and the list of what it deliberately allows both live in the `docs/standards/` document its message points to, holds the whole operator facing text in one `MESSAGE` constant ending in that pointer, exports the matching predicate so the test can drive it directly, and opens `create` with a file name guard that returns an empty visitor object for the paths the rule does not police.
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid `useEffect` in front end code.' },
    schema: [],
    messages: { useEffect: MESSAGE },
  },
  create(context) {
    if (!isSiteFile(context.filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        if (isUseEffectCallee(node.callee)) {
          context.report({ node: node.callee, messageId: 'useEffect' });
        }
      },
    };
  },
};
