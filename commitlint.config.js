export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    // `@commitlint/config-conventional` caps body lines at 100 too. The header
    // cap earns its keep — it is what `git log --oneline` shows. The body cap
    // does not: this repository's convention is a body that names the trade-off
    // and the measurement, and a markdown table comparing before and after is
    // the clearest way to do that. A table row is routinely 104 characters, so
    // the rule rejected exactly the commits the conventions ask for, at the last
    // gate of a long task. Off rather than raised, because any number picked
    // here would be the next arbitrary wall.
    'body-max-line-length': [0],
    'scope-enum': [
      2,
      'always',
      [
        'borso-fr',
        'borsouvertures',
        'last-loop-lepin',
        'pragma',
        'infra',
        'ci',
        'docs',
        'deps',
        'meta',
      ],
    ],
  },
};
