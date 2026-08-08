import {
  areInterchangeable,
  isGuardClause,
  isLookupTableSwitch,
  isPlainValue,
  isShapeTest,
  isValueReference,
} from './decisions.js';
import { isPureFile, isTestFile } from './impurity.js';

/**
 * A *decision* belongs in a pure function, so that it can be tested by calling
 * it with values and asserting on values, with no mock, no fixture database,
 * and no rendered component.
 *
 * The impure code left behind then reads inputs, calls one decision function,
 * and applies the result, which a reviewer can check by eye.
 *
 * ## Where the boundary sits, and why
 *
 * The rule used to report every syntactic branch, which produced roughly nine
 * hundred findings, almost none of which named a decision. A repository that
 * writes `row.chart === null ? null : JSON.parse(row.chart)` is handling the
 * shape of a database row, and extracting that into `decodeChart` would buy a
 * test that asserts `JSON.parse` was called. A rule that makes code worse gets
 * switched off, correctly, so the rule now reports decisions only.
 *
 * A *decision* compares domain values, chooses between different behaviours,
 * or computes a domain outcome. Everything below is shape handling or
 * presentation instead, so it is exempt.
 *
 * 1. A **shape test**, which asks whether a value is present or what kind of
 *    thing it is, rather than what it means. That covers `x === null`,
 *    `x === undefined`, `x == null`, `!x`, `'key' in object`,
 *    `Array.isArray(x)`, `typeof x === 'string'`, `x instanceof ApiError`, and
 *    a conjunction of those, e.g. `'title' in updates && updates.title !==
 *    undefined`, which is one presence test written twice. `?.` and `??` are
 *    never reported at all, for the same reason.
 * 2. A **guard clause**, meaning an `if` with no `else` whose consequent is a
 *    single `return` or a single `throw`. A guard clause is a guard clause
 *    wherever it appears, so this is no longer limited to `*.controller.ts`.
 * 3. A **conditional action**, meaning an `if` with no `else` whose test is a
 *    bare value reference, e.g. `if (rootElement) { mount(); }`. Nothing is
 *    chosen there, the code either acts or it does not.
 * 4. A **choice between two plain values**, e.g. `isActive ? 'bg-accent' :
 *    'bg-transparent'`, `count > 0 ? count : 0`, and the `&&` form
 *    `canSort && 'cursor-pointer'`. Two calls to the same function with plain
 *    arguments count as plain too, e.g. `isBusy ? t('catalog.uploading') :
 *    t('catalog.uploadPrompt')`, because the choice is still between two
 *    constants.
 * 5. A **switch used as a lookup table**, meaning every case body is a single
 *    `return` of a plain value.
 * 6. Everything inside a `.core.ts` or `.utils.ts` file, which is where the
 *    rule wants decisions to be, and everything inside a test file, because a
 *    test's job is to enumerate cases.
 *
 * ## The judgement calls inside that list
 *
 * `instanceof` is not in the standard's written list, and it is exempt here
 * because it asks what kind of value it holds, which is the same question as
 * `typeof` and `Array.isArray`. `error instanceof ApiError ? error.message :
 * fallback` reads an error, it does not decide anything about the domain.
 *
 * Comparing `.length` or `.size` against `0` is exempt, because an empty
 * collection is an absent value written the way JavaScript writes it. Any
 * other comparison against a number is a threshold, so it is reported.
 *
 * `!value` is exempt everywhere, and a bare `value` is exempt only as the test
 * of an `if` with no `else`. Both forms are how absence gets written when the
 * code only wants to skip something, e.g. `if (!renderingContext) return;` and
 * `if (rootElement) { mount(); }`. Once an `else` or a second branch appears, a
 * bare `value` is the flag half of a decision, so `isAdmin ? readAll() :
 * readOwn()` stays reported.
 *
 * A shape test is exempt whatever its branches do, so
 * `dsql === null ? createLocalClient(local) : createDsqlClient(dsql)` is
 * exempt even though the two branches call different functions. Choosing a
 * client because a configuration value is absent is wiring, not a rule about
 * songs or runners.
 *
 * Where a case is genuinely ambiguous the rule exempts it, because a false
 * positive costs more than a missed extraction. The missed extraction is
 * caught in review, and a false positive teaches people to ignore the rule.
 *
 * ## What the sibling rule still catches
 *
 * Widening the guard clause exemption means `if (laps > required) { return
 * 'finisher'; } return 'running';` is no longer reported here. It is still
 * reported by `borso/pure-functions-live-in-core-files`, which sees a whole
 * function that branches and touches nothing outside its arguments, and asks
 * for the function to move to a `.core.ts` file. The two rules overlap on
 * purpose, and the sibling is the one that catches a decision written as a
 * chain of guards.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */
const MESSAGE =
  'Move this decision into a pure function in a `.core.ts` or `.utils.ts` file, and call it ' +
  'from here. A decision in impure code cannot be tested without standing up whatever the ' +
  'surrounding code touches. A presence test, a guard clause, and a choice between two plain ' +
  'values are exempt. See docs/standards/02-purity-and-core-files.md.';

function isInsideJsx(node) {
  let current = node.parent;
  while (current !== undefined && current !== null) {
    if (current.type === 'JSXExpressionContainer') {
      return true;
    }
    if (current.type === 'JSXElement' || current.type === 'JSXFragment') {
      return false;
    }
    current = current.parent;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require every business decision to live in a pure `.core.ts` or `.utils.ts` file.',
    },
    schema: [],
    messages: { moveToPureFunction: MESSAGE },
  },
  create(context) {
    const { filename, sourceCode } = context;
    if (isPureFile(filename) || isTestFile(filename)) {
      return {};
    }

    function report(node) {
      context.report({ node, messageId: 'moveToPureFunction' });
    }

    return {
      IfStatement(node) {
        if (isGuardClause(node) || isShapeTest(node.test)) {
          return;
        }
        if (node.alternate === null && isValueReference(node.test)) {
          return;
        }
        report(node);
      },
      ConditionalExpression(node) {
        if (
          isShapeTest(node.test) ||
          areInterchangeable(node.consequent, node.alternate, sourceCode)
        ) {
          return;
        }
        report(node);
      },
      SwitchStatement(node) {
        if (isLookupTableSwitch(node)) {
          return;
        }
        report(node);
      },
      LogicalExpression(node) {
        if (node.operator === '??' || !isInsideJsx(node)) {
          return;
        }
        if (isShapeTest(node.left) || isPlainValue(node.right)) {
          return;
        }
        report(node);
      },
    };
  },
};
