import { createRuleTester } from './rule-tester.js';
import rule from './no-french-identifiers.js';

createRuleTester('apps/last-loop-lepin/api/src/runner/runner.schema.ts', { jsx: false }).run(
  'no-french-identifiers',
  rule,
  {
    valid: [
      'const firstName = runner.firstName;',
      'const location = edition.location;',
      'const runnerProfile = buildRunnerProfile(runner);',
      // Words that merely start with a dictionary entry.
      'const nomination = ballot.nomination;',
      'const nominee = ballot.nominee;',
      'const department = organisation.department;',
      'const departureTime = leg.departureTime;',
      'const pieces = board.pieces;',
      // A word French and English share.
      'const instrumentSlot = lineup.instrumentSlot;',
      'const pianoBench = 1;',
      // French text a user reads, which lives in the catalogue.
      'const label = "Classement général";',
      // Names somebody else chose.
      "import { fiche } from 'external-library';",
      'const { nom } = runner;',
      'const label = runner.prenom;',
    ],
    invalid: [
      {
        code: 'const prenom = "";',
        errors: [{ messageId: 'frenchIdentifier', data: { name: 'prenom', segment: 'prenom' } }],
      },
      { code: 'const lieuLabel = "";', errors: [{ messageId: 'frenchIdentifier' }] },
      { code: 'const porteurTonal = "";', errors: [{ messageId: 'frenchIdentifier' }] },
      {
        code: 'function RunnerFichePage() { return null; }',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'const projectStanding = (coureur) => coureur;',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      // A Drizzle column and a Zod field, which is where a French noun does
      // the most damage.
      {
        code: 'const runnersTable = pgTable("runners", { prenom: text("prenom") });',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'interface Runner { parcours: string }',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'type Edition = { boucle: number };',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'enum Stage { Depart = "depart" }',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'class ClassementBuilder {}',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'const equipment = { matosList: [] };',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      // Three entries are spelled the same in both languages, so the rule
      // cannot tell a rehearsal from a repeated value, a stage start from an
      // English `depart`, or a chess piece from a room. They stay in the
      // dictionary because the words arrived here in French, and the rule's
      // options are how an application that means the English word opts out.
      {
        code: 'const repetitionCount = 3;',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'const pieceCount = 3;',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'const departTime = 3;',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
    ],
  },
);

// Both lists extend through the options. `allowedWords` is what a chess
// application uses to keep `piece`, which is its English domain term.
createRuleTester('apps/borsouvertures/site/components/atoms/BoardView.tsx').run(
  'no-french-identifiers (options)',
  rule,
  {
    valid: [
      { code: 'const dossard = 1;', options: [{}] },
      {
        code: 'const onPieceDrop = (from, to) => move(from, to);',
        options: [{ allowedWords: ['piece'] }],
      },
      {
        code: 'const isPromotionPiece = (piece) => piece === "queen";',
        options: [{ allowedWords: ['piece'] }],
      },
    ],
    invalid: [
      {
        code: 'const onPieceDrop = (from, to) => move(from, to);',
        errors: [{ messageId: 'frenchIdentifier' }],
      },
      {
        code: 'const dossard = 1;',
        options: [{ additionalFrenchWords: ['dossard'] }],
        errors: [{ messageId: 'frenchIdentifier' }],
      },
    ],
  },
);
