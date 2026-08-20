import { readIdentifierSegments, readParameterIdentifiers } from './identifier-segments.js';

const ABBREVIATION_MESSAGE =
  '`{{name}}` abbreviates `{{segment}}`. Write the whole word, because the name is read far ' +
  'more often than it is written and nobody searching for the full word finds the short one. ' +
  'See docs/standards/01-naming.md.';

const TOO_SHORT_MESSAGE =
  '`{{name}}` is too short to say what it holds. Name the thing, e.g. `runner`, `candidate`, ' +
  'or `migrationDigest`, and keep a single letter for a `for` header counter. ' +
  'See docs/standards/01-naming.md.';

const ABBREVIATIONS = [
  'cfg',
  'msg',
  'val',
  'idx',
  'arr',
  'obj',
  'str',
  'num',
  'fn',
  'cb',
  'ctx',
  'elem',
  'err',
  'res',
  'req',
  'tmp',
  'prev',
  'curr',
  'dur',
  'pos',
  'attr',
  'btn',
  'img',
  'desc',
  'qty',
];

const ALLOWED_NAMES = [
  'id',
  'url',
  'uri',
  'api',
  'db',
  'ui',
  'gpx',
  'uci',
  'bpm',
  'csv',
  'png',
  'svg',
  'lat',
  'lng',
  'dto',
];

const MINIMUM_NAME_LENGTH = 3;

const FOR_HEADER_TYPES = new Set(['ForStatement', 'ForOfStatement', 'ForInStatement']);

const SKIPPED_NAME_PREFIX = '_';

function isForHeaderDeclarator(declarator) {
  const declaration = declarator.parent;
  if (declaration === undefined || declaration.type !== 'VariableDeclaration') {
    return false;
  }
  return declaration.parent !== undefined && FOR_HEADER_TYPES.has(declaration.parent.type);
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid abbreviated and single letter names.' },
    schema: [
      {
        type: 'object',
        properties: {
          additionalAbbreviations: { type: 'array', items: { type: 'string' } },
          additionalAllowedNames: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: { abbreviation: ABBREVIATION_MESSAGE, tooShort: TOO_SHORT_MESSAGE },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const abbreviations = new Set([
      ...ABBREVIATIONS,
      ...(options.additionalAbbreviations ?? []).map((entry) => entry.toLowerCase()),
    ]);
    const allowedNames = new Set([
      ...ALLOWED_NAMES,
      ...(options.additionalAllowedNames ?? []).map((entry) => entry.toLowerCase()),
    ]);

    function checkName(node, { isForHeaderBinding = false } = {}) {
      const name = node.name;
      if (name.startsWith(SKIPPED_NAME_PREFIX) || allowedNames.has(name.toLowerCase())) {
        return;
      }
      const segment = readIdentifierSegments(name).find((entry) => abbreviations.has(entry));
      if (segment !== undefined) {
        context.report({ node, messageId: 'abbreviation', data: { name, segment } });
        return;
      }
      if (name.length < MINIMUM_NAME_LENGTH && !isForHeaderBinding) {
        context.report({ node, messageId: 'tooShort', data: { name } });
      }
    }

    function checkFunction(node) {
      if (node.id !== null && node.id !== undefined) {
        checkName(node.id);
      }
      for (const parameter of readParameterIdentifiers(node)) {
        checkName(parameter);
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') {
          checkName(node.id, { isForHeaderBinding: isForHeaderDeclarator(node) });
        }
      },
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      ClassDeclaration(node) {
        if (node.id !== null && node.id !== undefined) {
          checkName(node.id);
        }
      },
      CatchClause(node) {
        if (node.param !== null && node.param?.type === 'Identifier') {
          checkName(node.param);
        }
      },
    };
  },
};
