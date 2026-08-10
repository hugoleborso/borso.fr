import {
  areInterchangeable,
  isGuardClause,
  isLookupTableSwitch,
  isNamedResultOrPresenceTest,
  isNamedResultTest,
  isPlainValue,
} from './decisions.js';
import { isPureFile, isTestPath } from './impurity.js';

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
 *    `x === undefined`, `x == null`, `!x`, `x === ''`, `'key' in object`,
 *    `Array.isArray(x)`, `typeof x === 'string'`, `x instanceof ApiError`, and
 *    a conjunction of those, e.g. `'title' in updates && updates.title !==
 *    undefined`, which is one presence test written twice. `?.` and `??` are
 *    never reported at all, for the same reason.
 * 2. A **test that reads an already named result**, meaning a bare identifier
 *    such as `isConcert`, `moreOpen` or `editingConcert`, or a dotted path
 *    whose last segment reads as a claim such as `props.hasOverride` and
 *    `props.showTransitionWarningBefore`. The deciding happened wherever that
 *    name was bound, so re-deriving it into a `.core.ts` file would buy a
 *    function that returns its own argument.
 * 3. A **presence test on a dotted path**, e.g. `props.customDomain ? … : …`
 *    and `...(props.dsqlSchema ? { … } : {})`. `!props.customDomain` is
 *    already exempt under 1, and an exemption that turns on which way round
 *    the branches are written is not one anybody can follow.
 * 4. A **guard clause**, meaning an `if` with no `else` whose consequent is a
 *    single `return` or a single `throw`. A guard clause is a guard clause
 *    wherever it appears, so this is no longer limited to `*.controller.ts`.
 * 5. A **choice between two plain values**, e.g. `isActive ? 'bg-accent' :
 *    'bg-transparent'`, `count > 0 ? count : 0`, and the `&&` form
 *    `canSort && 'cursor-pointer'`. Two calls to the same function with plain
 *    arguments count as plain too, e.g. `isBusy ? t('catalog.uploading') :
 *    t('catalog.uploadPrompt')`, because the choice is still between two
 *    constants.
 * 6. A **switch used as a lookup table**, meaning every case body is a single
 *    `return` of a plain value.
 * 7. Everything inside a `.core.ts` or `.utils.ts` file, which is where the
 *    rule wants decisions to be, and everything under a test path, because a
 *    test's job is to enumerate cases and a fake's job is to dispatch on what
 *    it was handed. `isTestPath` rather than `isTestFile`, so a harness helper
 *    that is not itself named `*.test.ts` is exempt too, e.g.
 *    `infra/cdk/test/unit/helpers/migration-runner-mock.ts`.
 *
 * Exemptions 1 to 3 compose, so a conjunction or a disjunction built only from
 * them is exempt too, e.g. `isConcert && !editingConcert` and
 * `props.allowedOrigins && props.allowedOrigins.length > 0`.
 *
 * ## The judgement calls inside that list
 *
 * `instanceof` is not in the standard's written list, and it is exempt here
 * because it asks what kind of value it holds, which is the same question as
 * `typeof` and `Array.isArray`. `error instanceof ApiError ? error.message :
 * fallback` reads an error, it does not decide anything about the domain.
 *
 * Comparing `.length` or `.size` against `0` is exempt, and so is comparing
 * against `''`, because an empty collection and an empty string are both an
 * absent value written the way JavaScript writes it. Any other comparison
 * against a number is a threshold, so it is reported.
 *
 * Trusting a claim shaped property name is the widest of these, and the reason
 * it is safe is `unicorn/consistent-boolean-name`, which runs repo wide at
 * `error`. That rule enforces the correspondence in both directions, so a
 * variable or a parameter named `hasOverride` is a boolean and a boolean
 * cannot be named `override`. Its reach stops at object type members, which
 * this rule does trust, on the ground that a property called `hasOverride`
 * reads as a claim to every reviewer whether or not a linter says so.
 *
 * Which leaves the one asymmetry left in the list. A dotted path with an
 * ordinary name is a presence test as the test of an `if` or a ternary, and it
 * is a decision as the left of `&&` in JSX, so `runner.finished && <Medal />`
 * is still reported. Rendering a medal because a field is truthy is the
 * decision the standard opens with, and `finished` is a past participle rather
 * than a claim, so nothing here has named the result yet.
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
  'surrounding code touches. A presence test, a guard clause, a test that reads an already ' +
  'named result such as `isConcert` or `props.hasOverride`, and a choice between two plain ' +
  'values are all exempt. See docs/standards/02-purity-and-core-files.md.';

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

/**
 * Whether a logical expression is itself the thing JSX renders, as opposed to
 * a part of a larger test.
 *
 * `{isConcert && capacity !== null ? <Seats /> : null}` holds one condition
 * and would otherwise be reported twice, once by the ternary and once by its
 * own test, under two different exemption lists. The enclosing `if`, ternary,
 * negation or logical expression is the one that judges the test.
 */
function isRenderedByJsx(node) {
  const { parent } = node;
  if (parent.type === 'LogicalExpression' || parent.type === 'UnaryExpression') {
    return false;
  }
  if (
    (parent.type === 'ConditionalExpression' || parent.type === 'IfStatement') &&
    parent.test === node
  ) {
    return false;
  }
  return isInsideJsx(node);
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
    if (isPureFile(filename) || isTestPath(filename)) {
      return {};
    }

    function report(node) {
      context.report({ node, messageId: 'moveToPureFunction' });
    }

    return {
      IfStatement(node) {
        if (isGuardClause(node) || isNamedResultOrPresenceTest(node.test)) {
          return;
        }
        report(node);
      },
      ConditionalExpression(node) {
        if (
          isNamedResultOrPresenceTest(node.test) ||
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
        if (node.operator === '??' || !isRenderedByJsx(node)) {
          return;
        }
        if (isNamedResultTest(node.left) || isPlainValue(node.right)) {
          return;
        }
        report(node);
      },
    };
  },
};
