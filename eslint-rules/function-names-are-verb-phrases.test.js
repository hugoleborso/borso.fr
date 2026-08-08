import { createRuleTester } from './rule-tester.js';
import rule from './function-names-are-verb-phrases.js';

createRuleTester('apps/pragma/site/src/components/organisms/CatalogGrid.tsx').run(
  'function-names-are-verb-phrases',
  rule,
  {
    valid: [
      'function digestMigrations(files) { return files; }',
      'const projectRunnerStanding = (runner, punches, now) => ({ runner, punches, now });',
      'function listSongs() { return []; }',
      // A verb the pattern only matches with an upper case letter after it.
      'function download(fileUrl) { return fetchFile(fileUrl); }',
      'function documentTitle() { return title; }',
      'const handler = (event) => onSelect(event);',
      'function handle() { return null; }',
      'function processed() { return true; }',
      // A React component and a hook.
      'function DoNotDisturbIcon() { return null; }',
      'const ManageMembersPanel = () => null;',
      'const useDoubleTap = () => null;',
      // A binding from a library rather than a declaration of ours.
      'const { handleSubmit } = useForm();',
      // An anonymous function, which has no name to judge.
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
