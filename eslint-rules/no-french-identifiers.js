import { readIdentifierSegments, readParameterIdentifiers } from './identifier-segments.js';

/**
 * Every identifier in this repository is English. The rule that keeps it that
 * way is not a preference, it is what makes the translation catalogues the one
 * place non-English text lives, and the failure mode is specific: a French
 * noun arrives during a conversation, somebody writes it down as a field name,
 * and the schema, the API, and the front end carry it for years.
 *
 * The dictionary is therefore seeded from the words this repository has
 * actually met, e.g. `fiche` in `RunnerFichePage` and `prenom` in a form. The
 * translation belongs in the same commit, e.g. `prenom` to `firstName`,
 * `lieu` to `location`, `coureur` to `runner`, and `porteurTonal` to
 * `tonalCentreHolder`.
 *
 * Matching is on whole segments, so `nomination`, `departure`, and `pieces`
 * pass while `nomLabel`, `departTime`, and `pieceCount` do not.
 *
 * Unlike `no-abbreviated-identifier`, this rule also reads object literal keys
 * and type members, because a Drizzle column and a Zod field are exactly where
 * a French noun does the most damage, and no third party is going to hand us a
 * French wire format.
 *
 * What this deliberately allows:
 *
 * - `instrument`, `piano`, and every other word French and English share.
 * - String contents, since user facing French lives in `i18n/fr.json`.
 * - Imported and destructured bindings, whose names come from elsewhere.
 *
 * Three entries are spelled the same in both languages, which are `repetition`
 * (a rehearsal here, and an English word elsewhere), `piece` (a room here, and
 * a chess piece elsewhere), and `depart` (a stage start here, and an English
 * verb elsewhere). `borsouvertures` is a chess application, where `piece` is
 * the English domain term and `onPieceDrop` is the right name, so an
 * application whose domain owns one of the three drops it with
 * `allowedWords`. That option exists for exactly this, and not as a general
 * way to keep a French name.
 *
 * Both lists extend through the rule options.
 *
 * See docs/standards/01-naming.md and docs/standards/09-i18n.md.
 */
const MESSAGE =
  '`{{name}}` contains the French word `{{segment}}`. Every identifier in this repository is ' +
  'English, e.g. `prenom` is `firstName`, `lieu` is `location`, `coureur` is `runner`, and ' +
  '`fiche coureur` is `runnerProfile`. Text a user reads goes in `i18n/fr.json` instead. ' +
  'See docs/standards/01-naming.md.';

/** Seeded from the French words this repository has met. */
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
      // A property inside an `ObjectPattern` is a destructured binding, whose
      // name comes from the shape being destructured.
      if (node.parent?.type === 'ObjectPattern') {
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
