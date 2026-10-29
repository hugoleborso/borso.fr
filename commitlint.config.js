const DEPENDABOT_SIGN_OFF = /^Signed-off-by: dependabot\[bot\] <support@github\.com>$/m;

const isWrittenByDependabot = (message) => DEPENDABOT_SIGN_OFF.test(message);

export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [isWrittenByDependabot],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-leading-blank': [0],
    'footer-max-line-length': [0],
    'scope-enum': [
      2,
      'always',
      [
        'banana-rush',
        'borso-fr',
        'borsouvertures',
        'last-loop-lepin',
        'pragma',
        'talos',
        'infra',
        'ci',
        'docs',
        'deps',
        'meta',
      ],
    ],
  },
};
