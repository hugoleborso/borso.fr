import { readIdentifierSegments, readParameterIdentifiers } from './identifier-segments.js';

const MESSAGE =
  '`{{name}}` contains the French word `{{segment}}`. Every identifier in this repository is ' +
  'English, e.g. `prenom` is `firstName`, `lieu` is `location`, `coureur` is `runner`, and ' +
  '`fiche coureur` is `runnerProfile`. Text a user reads goes in `i18n/fr.json` instead. ' +
  'See docs/standards/01-naming.md.';

const FRENCH_WORDS = [
  'prenom',
  'nom',
  'lieu',
  'porteur',
  'matos',
  'fiche',
  'coureur',
  'parcours',
  'boucle',
  'depart',
  'arrivee',
  'classement',
  'reglage',
  'chanson',
  'repetition',
  'membre',
  'seance',
  'ouverture',
  'piece',
  'travaux',
];

function isDestructuredBinding(node) {
  return node.parent?.type === 'ObjectPattern';
}

// @FollowsBlueprint lint-rule
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Forbid French words in identifiers.' },
    schema: [
      {
        type: 'object',
        properties: {
          additionalFrenchWords: { type: 'array', items: { type: 'string' } },
          allowedWords: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: { frenchIdentifier: MESSAGE },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const allowedWords = new Set((options.allowedWords ?? []).map((entry) => entry.toLowerCase()));
    const frenchWords = new Set(
      [
        ...FRENCH_WORDS,
        ...(options.additionalFrenchWords ?? []).map((entry) => entry.toLowerCase()),
      ].filter((word) => !allowedWords.has(word)),
    );

    function checkName(node) {
      const name = node.name;
      const segment = readIdentifierSegments(name).find((entry) => frenchWords.has(entry));
      if (segment !== undefined) {
        context.report({ node, messageId: 'frenchIdentifier', data: { name, segment } });
      }
    }

    function checkKey(node) {
      if (isDestructuredBinding(node)) {
        return;
      }
      if (!node.computed && node.key.type === 'Identifier') {
        checkName(node.key);
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
          checkName(node.id);
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
      Property: checkKey,
      MethodDefinition: checkKey,
      PropertyDefinition: checkKey,
      TSPropertySignature: checkKey,
      TSMethodSignature: checkKey,
      TSEnumMember(node) {
        if (node.id.type === 'Identifier') {
          checkName(node.id);
        }
      },
      TSInterfaceDeclaration(node) {
        checkName(node.id);
      },
      TSTypeAliasDeclaration(node) {
        checkName(node.id);
      },
    };
  },
};
