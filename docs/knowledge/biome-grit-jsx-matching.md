# Biome Grit plugins for JSX — the AST shape that's easy to miss

Biome 2.x ships a Grit-based plugin engine that runs as part of
`biome lint` / `biome check`. The existing repo plugins
(`no-direct-api-fetch-in-site.grit`,
`no-controller-imports-outside-service.grit`,
`no-inline-subscribe-in-use-sync-external-store.grit`,
`no-type-assertion-except-unknown.grit`) only target JS-side AST.
The first attempt to write a JSX-targeting plugin in PR
`./lessons-from-pr-27` ran straight into two undocumented (in the
Biome docs) requirements. Capturing them so the next plugin author
doesn't burn the same hour.

## The two requirements

```grit
engine biome(1.0)
language js(jsx)
```

Both lines at the top of the .grit file. Without them, JSX nodes
are invisible to the pattern engine — every JSX-matching pattern
silently matches nothing, with no plugin-load error to flag it.

The biome docs at <https://biomejs.dev/linter/plugins/> don't
mention JSX support explicitly (and at the time of writing say "We
currently do not support other target languages than JavaScript
and CSS"). The proof is in
[`crates/biome_grit_patterns/tests/specs/tsx/jsx_nodes.grit`](https://github.com/biomejs/biome/blob/main/crates/biome_grit_patterns/tests/specs/tsx/jsx_nodes.grit)
in the biome source — that's where the public JSX node names + the
two-line preamble live.

## JSX attribute strings are NOT JS string literals

This was the trap. Given `<a href="/api/foo">`, the literal
`"/api/foo"` parses to :

```
JsxAttribute
├── name: JsxName "href"
└── initializer: JsxAttributeInitializerClause
    ├── "="
    └── value: JsxString
        └── value_token: JSX_STRING_LITERAL "\"/api/foo\""
```

The grit template `\`"/api/$_"\``matches a JS`string`AST node
(the kind that lives inside`fetch('/api/foo')`or`const x = '/api/foo'`). `JsxString` is a different node ; the
template never matches.

The right shape :

```grit
JsxString() as $s where {
  $s <: r".*[\"']/api/.*",
  register_diagnostic(span = $s, message = "...", severity = "error")
}
```

`$s` bound to the whole `JsxString` literally equals `"/api/foo"`
_including the surrounding quotes_, so the regex looks for the
quote-then-slash sequence ; the same regex handles single-quoted
JSX strings.

## Cheat-sheet of useful JSX node names

From [`crates/biome_grit_patterns/tests/specs/tsx/`](https://github.com/biomejs/biome/tree/main/crates/biome_grit_patterns/tests/specs/tsx)
in biome's source :

- `JsxOpeningElement` / `jsx_opening_element`
- `JsxSelfClosingElement` / `jsx_self_closing_element`
- `JsxClosingElement` / `jsx_closing_element`
- `JsxElement` / `jsx_element`
- `JsxAttribute` / `jsx_attribute` — slots `(name, initializer)`
- `JsxAttributeInitializerClause` — slots `(eq_token, value)`
- `JsxString` — JSX-only string literal (the value of an
  attribute when written as `"x"`)
- `JsxExpression` / `jsx_expression` — the `{…}` braces wrapping
  a JS expression inside JSX
- `JsxText` — text between elements
- `JsxName` — attribute or element name

PascalCase and snake_case both work as pattern syntax. Filtering
on a slot uses `kwarg = value` :
`jsx_attribute(name = "className")`. Or positional :
`JsxAttribute($name, $init)`.

## The "string isn't JsxString" trap, distilled

Rule of thumb : if a Grit plugin needs to look at any literal
that's an attribute value, write it against `JsxString`. If it
needs to look at any literal in a JS expression (function call,
assignment, return value, JSX `{…}` interpolation), write it
against the normal `\`"..."\`` template. The two are different
AST nodes and a pattern for one won't match the other.

## See also

- [`docs/dantotsus/api-anchor-must-use-api-url-on-preview.md`](../dantotsus/api-anchor-must-use-api-url-on-preview.md)
  — the dantotsu that surfaced this distinction.
- [`biome-plugins/no-api-anchor-in-site.grit`](../../biome-plugins/no-api-anchor-in-site.grit)
  — working JSX plugin built on these notes.
- [`biome-plugins/no-direct-api-fetch-in-site.grit`](../../biome-plugins/no-direct-api-fetch-in-site.grit)
  — sibling plugin on the JS-string surface, for contrast.
