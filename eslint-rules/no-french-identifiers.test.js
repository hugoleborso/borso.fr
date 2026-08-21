import { createRuleTester } from './rule-tester.js';
import rule from './no-french-identifiers.js';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/last-loop-lepin/api/src/runner/runner.schema.ts', { jsx: false }).run(
  'no-french-identifiers',
  rule,
  {
    valid: [
      'const firstName = runner.firstName;',
      'const location = edition.location;',
      'const runnerProfile = buildRunnerProfile(runner);',
      'const nomination = ballot.nomination;',
      'const nominee = ballot.nominee;',
      'const department = organisation.department;',
      'const departureTime = leg.departureTime;',
      'const pieces = board.pieces;',
      'const instrumentSlot = lineup.instrumentSlot;',
      'const pianoBench = 1;',
      'const label = "Classement général";',
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
