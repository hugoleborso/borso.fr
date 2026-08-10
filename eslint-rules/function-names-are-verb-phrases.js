import { readFunctionName } from './impurity.js';

/**
 * A function name answers "what do I get back". `handleSetlist` answers
 * nothing, so the reader opens the body, and the four banned verbs are the
 * ones that guarantee that trip: `handle`, `process`, `manage`, and `do`.
 *
 * The replacement is in the verb table in the standard, where each verb
 * promises a return value, e.g. `find…` returns the thing or `null`, `list…`
 * returns an array, and `project…` returns a view computed from source data.
 *
 * The match needs an upper case letter after the verb, which is what tells
 * `doWork` from `download` and `handleClick` from `handler`. A name that is
 * exactly one of the four verbs, e.g. a Hono middleware named `handle`, is not
 * matched, because the standard's complaint is a verb followed by a noun that
 * says nothing.
 *
 * What this deliberately allows:
 *
 * - A React component, which is `PascalCase` and returns a tree rather than a
 *   value, e.g. `DoNotDisturbIcon`.
 * - A hook, which is `use<Uppercase>`.
 * - A destructured binding, e.g. `const { handleSubmit } = useForm()`, since
 *   the name comes from the library.
 * - A property that holds something other than a function, since only function
 *   nodes are visited.
 *
 * See docs/standards/01-naming.md.
 */
const MESSAGE =
  '`{{name}}` starts with `{{verb}}`, which promises the reader nothing. Name the function ' +
  'after what it returns, e.g. `find…` for the thing or `null`, `list…` for an array, ' +
  '`build…` for a new value, `project…` for a computed view, and `is…` for a boolean. ' +
  'See docs/standards/01-naming.md.';

const BANNED_VERB_PATTERN = /^(handle|process|manage|do)(?=[A-Z])/;

const COMPONENT_NAME_PATTERN = /^[A-Z]/;

const HOOK_NAME_PATTERN = /^use[A-Z]/;

function readDeclaredFunctionName(node) {
  const parent = node.parent;
  if (
    parent !== undefined &&
    (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') &&
    !parent.computed &&
    parent.key.type === 'Identifier'
  ) {
    return parent.key.name;
  }
  return readFunctionName(node);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Require a function name that says what the function returns.' },
    schema: [],
    messages: { mechanismVerb: MESSAGE },
  },
  create(context) {
    function checkFunction(node) {
      const name = readDeclaredFunctionName(node);
      if (name === null || COMPONENT_NAME_PATTERN.test(name) || HOOK_NAME_PATTERN.test(name)) {
        return;
      }
      const match = BANNED_VERB_PATTERN.exec(name);
      if (match !== null) {
        context.report({ node, messageId: 'mechanismVerb', data: { name, verb: match[1] } });
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};
