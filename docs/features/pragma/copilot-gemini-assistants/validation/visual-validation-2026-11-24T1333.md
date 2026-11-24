# Visual validation: GitHub Copilot and Gemini CLI assistants

Verdict: PASS. Run by the implementing session, not a separate validator agent, because the operator asked for no review.

Reviewed commit: 97e51dcc. Local dev server (`scripts/dev-server.sh start pragma`), signed in as the seeded member `hugo`, page `/account?view=sign-in`, viewport 375 x 812.

| Assertion | Result | Evidence |
| --- | --- | --- |
| The assistant card lists Claude Code, Mistral Vibe, GitHub Copilot, Gemini CLI, in that order | PASS | after-light-375.png |
| GitHub Copilot shows the Copilot mark, Gemini CLI the Gemini spark in #8E75B2 | PASS | after-light-375.png |
| The Copilot mark stays visible in dark mode | PASS | after-dark-375.png |
| Each new row has its own copy button | PASS | after-light-375.png, AssistantConnections.test.tsx |
| Nothing overflows at 375 px | PASS | both screenshots |

Labels truncate at 375 px for the long names (Claude Code, Mistral Vibe, GitHub Copilot). That predates this change.
