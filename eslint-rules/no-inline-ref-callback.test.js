import { createRuleTester } from './rule-tester.js';
import rule from './no-inline-ref-callback.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-inline-ref-callback', rule, {
  valid: [
    '<input ref={inputRef} />;',
    '<input ref={cancelSearchOnUnmount} />;',
    '<input ref={useMergedRefs(first, second)} />;',
    '<input onChange={() => setQuery(value)} />;',
    '<input ref="legacy" />;',
  ],
  invalid: [
    {
      code: '<input ref={() => publishSearchedTitle.cancel} />;',
      errors: [{ messageId: 'inlineRefCallback' }],
    },
    {
      code: '<input ref={(node) => { node?.focus(); }} />;',
      errors: [{ messageId: 'inlineRefCallback' }],
    },
    {
      code: '<input ref={function attach(node) { register(node); }} />;',
      errors: [{ messageId: 'inlineRefCallback' }],
    },
  ],
});
