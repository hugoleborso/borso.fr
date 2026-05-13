export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'scope-enum': [
      2,
      'always',
      ['borso-fr', 'borsouvertures', 'infra', 'ci', 'docs', 'deps', 'meta'],
    ],
  },
};
