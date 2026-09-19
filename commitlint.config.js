export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'scope-enum': [
      2,
      'always',
      [
        'banana-rush',
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
