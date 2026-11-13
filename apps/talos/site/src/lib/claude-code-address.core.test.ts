import { describe, expect, it } from 'vitest';
import catalogue from '../i18n/fr.json';
import {
  buildClaudeCodeAddress,
  buildEnvironmentAddress,
  composeTalosPrompt,
  selectClaudeCodeLinkTarget,
} from './claude-code-address.core';

describe('composeTalosPrompt', () => {
  it('puts the message after the preamble, trimmed', () => {
    expect(composeTalosPrompt('Lis la note.', '  Rappelle-moi Julie \n')).toBe(
      'Lis la note.\n\nRappelle-moi Julie',
    );
  });

  it('answers the preamble alone for a blank message', () => {
    expect(composeTalosPrompt('Lis la note.', ' \n ')).toBe('Lis la note.');
  });
});

describe('buildClaudeCodeAddress', () => {
  it('leaves the prompt out when there is none, so the session opens on an empty composer', () => {
    expect(
      buildClaudeCodeAddress({ repository: 'a/b', environmentId: 'env_01abc', prompt: '' }, 'web'),
    ).toBe('https://claude.ai/code/new?repo=a%2Fb&environment=env_01abc');
  });

  it('opens Claude Code on the repository and the environment, with the prompt encoded', () => {
    expect(
      buildClaudeCodeAddress(
        {
          repository: 'proprietaire/notes',
          environmentId: 'env_01abc',
          prompt: 'Lis ceci :\n\nÉcris & envoie 50 % ?',
        },
        'web',
      ),
    ).toBe(
      'https://claude.ai/code/new?repo=proprietaire%2Fnotes&environment=env_01abc' +
        '&q=Lis%20ceci%20%3A%0A%0A%C3%89cris%20%26%20envoie%2050%20%25%20%3F',
    );
  });

  it('leaves the environment out when none is configured', () => {
    expect(
      buildClaudeCodeAddress({ repository: 'a/b', environmentId: null, prompt: 'p' }, 'web'),
    ).toBe('https://claude.ai/code/new?repo=a%2Fb&q=p');
  });

  it('hands the Claude app its own scheme without the environment, which makes it drop the whole link', () => {
    expect(
      buildClaudeCodeAddress({ repository: 'a/b', environmentId: 'env_1', prompt: 'p' }, 'app'),
    ).toBe('claude://code/new?repo=a%2Fb&q=p');
  });
});

describe('selectClaudeCodeLinkTarget', () => {
  it('opens the web in a new tab and hands the app link over in place', () => {
    expect(selectClaudeCodeLinkTarget('web')).toBe('_blank');
    expect(selectClaudeCodeLinkTarget('app')).toBeUndefined();
  });
});

describe('buildEnvironmentAddress', () => {
  const target = { repository: 'a/b', environments: { talos: 'env_lecture', build: null } };

  it('opens the chosen environment of the deployment settings', () => {
    expect(buildEnvironmentAddress(target, 'talos', 'p', 'web')).toBe(
      'https://claude.ai/code/new?repo=a%2Fb&environment=env_lecture&q=p',
    );
    expect(buildEnvironmentAddress(target, 'build', 'p', 'web')).toBe(
      'https://claude.ai/code/new?repo=a%2Fb&q=p',
    );
  });

  it('has no address while the settings are still loading', () => {
    expect(buildEnvironmentAddress(undefined, 'talos', 'p', 'web')).toBeUndefined();
  });
});

describe('the prompts of the catalogue', () => {
  it('never tell Claude it is Talos, which the agent repository already says', () => {
    expect(Object.values(catalogue).filter((text) => /tu es talos/i.test(text))).toEqual([]);
  });
});
