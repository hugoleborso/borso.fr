const DEPENDABOT_SIGN_OFF = /^Signed-off-by: dependabot\[bot\] <support@github\.com>$/m;

const isWrittenByDependabot = (message) => DEPENDABOT_SIGN_OFF.test(message);

const SESSION_TRAILER = /^Claude-Session: \S*?session_(\w+)\s*$/gm;

const namesOnlyThisSession = ({ raw }) => {
  const sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID?.replace(/^cse_/, '');
  if (!sessionId) return [true];
  const otherSessions = [...(raw ?? '').matchAll(SESSION_TRAILER)]
    .map((match) => match[1])
    .filter((named) => named !== sessionId);
  return [
    otherSessions.length === 0,
    `Claude-Session names session_${otherSessions[0]}, but this commit comes from session_${sessionId}. Copy the trailer from this session's attribution reminder, not from another commit.`,
  ];
};

export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [isWrittenByDependabot],
  plugins: [{ rules: { 'claude-session-is-this-session': namesOnlyThisSession } }],
  rules: {
    'claude-session-is-this-session': [2, 'always'],
    'header-max-length': [2, 'always', 100],
    'subject-case': [0],
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
