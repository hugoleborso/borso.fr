---
summary: 'Under vitest''s jsdom environment, `new URL(''..'', import.meta.url)` is not a `file:` URL, so `fileURLToPath` throws; use `dirname(fileURLToPath(import.meta.url))` and `resolve` instead.'
triggers:
  output:
    - 'The URL must be of scheme file'
    - 'URL must be of scheme file'
---

# `import.meta.url` under jsdom resolves relative URLs against the page

Logged by PR #261's `live-invalidation-fix` agent in `apps/pragma`, whose
`core` vitest project runs every test under `environment: 'jsdom'`, including
the API tests that read source files.

```ts
// Throws "The URL must be of scheme file" under jsdom.
const folder = fileURLToPath(new URL('..', import.meta.url));

// Works in every environment.
const folder = resolve(dirname(fileURLToPath(import.meta.url)), '..');
```

jsdom installs its own global `URL`, so the relative URL is built by jsdom
and does not keep the `file:` scheme Node's `fileURLToPath` requires.
`import.meta.url` itself is still a `file:` URL, so converting it first and
walking the path with `node:path` avoids the global. The working pattern is in
`apps/pragma/api/src/realtime/derived-read-roots.test.ts`.
