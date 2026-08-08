import { isSiteFile } from './site-paths.js';

/**
 * Most effects in a React codebase are not synchronising React with anything
 * outside React, and they are working around React instead. An effect that
 * watches one piece of state and writes another is `useMemo` rebuilt by hand,
 * with an extra render, a stale closure risk, and a dependency array someone
 * will get wrong.
 *
 * The rule is deliberately blunt, because the standard bans the hook outright
 * and names a disable comment as the escape hatch. A genuine effect, e.g.
 * attaching a Leaflet map to a DOM node, is written as
 * `// eslint-disable-next-line borso/no-use-effect -- <which external system>`,
 * and `eslint-comments/require-description` makes the reason mandatory.
 *
 * What this deliberately allows:
 *
 * - Every other hook whose name starts with `useEffect`, e.g. `useEffectEvent`
 *   and a project hook named `useEffectOnce`, because the callee name is
 *   matched exactly.
 * - `useLayoutEffect` and `useInsertionEffect`, which the standard does not
 *   name. They are rare enough that a reviewer catches them.
 * - A method call named `useEffect` on some other object, because only
 *   `React.useEffect` is the React hook.
 * - Back end code, since the rule reads the file name and stays silent outside
 *   `apps/<app>/site/`.
 *
 * See docs/standards/07-state-and-effects.md.
 */
const MESSAGE =
  'No front end in this repository contains a `useEffect`. Compute during render for derived ' +
  'state, do the work in the event handler for a user action, use CSS for a media query or an ' +
  'animation, and use `useSyncExternalStore` for a value that lives outside React. When the ' +
  'effect is genuinely synchronising with an external system, disable this rule on the line ' +
  'and name the system. See docs/standards/07-state-and-effects.md.';

const HOOK_NAME = 'useEffect';
const REACT_NAMESPACE = 'React';

/** `useEffect(…)` and `React.useEffect(…)`, and nothing else named similarly. */
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

/** @type {import('eslint').Rule.RuleModule} */
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
