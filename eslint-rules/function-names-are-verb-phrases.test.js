import { createRuleTester } from './rule-tester.js';
import rule from './function-names-are-verb-phrases.js';

// @FollowsBlueprint test-lint-rule
createRuleTester('apps/pragma/site/src/components/organisms/CatalogGrid.tsx').run(
  'function-names-are-verb-phrases',
  rule,
  {
    valid: [
      'function digestMigrations(files) { return files; }',
      'const projectRunnerStanding = (runner, punches, now) => ({ runner, punches, now });',
      'function listSongs() { return []; }',
      'function download(fileUrl) { return fetchFile(fileUrl); }',
      'function documentTitle() { return title; }',
      'const handler = (event) => onSelect(event);',
      'function handle() { return null; }',
      'function processed() { return true; }',
      'function DoNotDisturbIcon() { return null; }',
      'const ManageMembersPanel = () => null;',
      'const useDoubleTap = () => null;',
      'const { handleSubmit } = useForm();',
      'songs.forEach(function () { return null; });',
    ],
    invalid: [
      {
        code: 'function handleClick() { return null; }',
        errors: [{ messageId: 'mechanismVerb', data: { name: 'handleClick', verb: 'handle' } }],
      },
      {
        code: 'const processRunner = (runner) => runner;',
        errors: [{ messageId: 'mechanismVerb' }],
      },
      {
        code: 'const service = { manageSession() { return null; } };',
        errors: [{ messageId: 'mechanismVerb' }],
      },
      {
        code: 'function doWork() { return null; }',
        errors: [{ messageId: 'mechanismVerb' }],
      },
      {
        code: 'class PunchGateway { handleRequest() { return null; } }',
        errors: [{ messageId: 'mechanismVerb' }],
      },
      {
        code: 'const registry = { processSetlist: (setlist) => setlist };',
        errors: [{ messageId: 'mechanismVerb' }],
      },
    ],
  },
);
