import { describe, expect, it } from 'vitest';
import {
  buildClaudeCodeAddress,
  composeTalosPrompt,
  isMessageTooLong,
  LONG_MESSAGE_THRESHOLD,
} from './message-composer.core';

describe('composeTalosPrompt', () => {
  it('puts the message after the preamble, trimmed', () => {
    expect(composeTalosPrompt('Tu es Talos.', '  Rappelle-moi Julie \n')).toBe(
      'Tu es Talos.\n\nRappelle-moi Julie',
    );
  });

  it('answers the preamble alone for a blank message', () => {
    expect(composeTalosPrompt('Tu es Talos.', ' \n ')).toBe('Tu es Talos.');
  });
});

describe('buildClaudeCodeAddress', () => {
  it('opens Claude Code on the repository and the environment, with the prompt encoded', () => {
    expect(
      buildClaudeCodeAddress({
        repository: 'proprietaire/notes',
        environmentId: 'env_01abc',
        prompt: 'Tu es Talos :\n\nÉcris & envoie 50 % ?',
      }),
    ).toBe(
      'https://claude.ai/code?repositories=proprietaire%2Fnotes&environment=env_01abc' +
        '&prompt=Tu%20es%20Talos%20%3A%0A%0A%C3%89cris%20%26%20envoie%2050%20%25%20%3F',
    );
  });

  it('leaves the environment out when none is configured', () => {
    expect(buildClaudeCodeAddress({ repository: 'a/b', environmentId: null, prompt: 'p' })).toBe(
      'https://claude.ai/code?repositories=a%2Fb&prompt=p',
    );
  });
});

describe('isMessageTooLong', () => {
  it('warns only beyond the threshold', () => {
    expect(isMessageTooLong('x'.repeat(LONG_MESSAGE_THRESHOLD))).toBe(false);
    expect(isMessageTooLong('x'.repeat(LONG_MESSAGE_THRESHOLD + 1))).toBe(true);
  });
});
