import { createRuleTester } from './rule-tester.js';
import rule from './no-direct-api-fetch-in-site.js';

// @FollowsBlueprint test-lint-rule
createRuleTester().run('no-direct-api-fetch-in-site', rule, {
  valid: [
    'await api.api.runners.$get();',
    "await fetch(signed.uploadUrl, { method: 'PUT', body: file });",
    "await fetch('https://example.com/api/thing');",
    'await fetch(buildApiUrl(path));',
    'await fetch();',
  ],
  invalid: [
    { code: "await fetch('/api/runners');", errors: [{ messageId: 'directFetch' }] },
    {
      code: 'await fetch("/api/runners", { method: "POST" });',
      errors: [{ messageId: 'directFetch' }],
    },
    { code: 'await fetch(`/api/runners/${runnerId}`);', errors: [{ messageId: 'directFetch' }] },
    { code: "await window.fetch('/api/punches');", errors: [{ messageId: 'directFetch' }] },
  ],
});
