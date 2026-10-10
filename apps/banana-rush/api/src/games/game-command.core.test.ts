import { describe, expect, it } from 'vitest';
import { COMMAND_USAGE, readCommandLine, selectExitCode } from './game-command.core';

// @FollowsBlueprint test-pure-unit
describe('readCommandLine', () => {
  it('reads a new game with its numbers coerced from the flags', () => {
    const commandLine = readCommandLine([
      'create',
      '--nickname',
      'Hugo',
      '--avatar',
      'chimp',
      '--maxPlayers',
      '4',
      '--winningScore',
      '200',
    ]);

    expect(commandLine).toEqual({
      isRefusal: false,
      command: {
        command: 'create',
        nickname: 'Hugo',
        avatar: 'chimp',
        maxPlayers: 4,
        winningScore: 200,
      },
    });
  });

  it('reads a round timer when one is given', () => {
    const commandLine = readCommandLine([
      'create',
      '--nickname=Hugo',
      '--avatar=chimp',
      '--maxPlayers=2',
      '--winningScore=100',
      '--roundTimerSeconds=30',
    ]);

    expect(commandLine).toMatchObject({ command: { roundTimerSeconds: 30 } });
  });

  it('normalizes the join code the way the route does', () => {
    const commandLine = readCommandLine(['show', '--code', 'abcd']);

    expect(commandLine).toEqual({ isRefusal: false, command: { command: 'show', code: 'ABCD' } });
  });

  it('reads a bid with the token and the amount', () => {
    const commandLine = readCommandLine(['bid', '--code', 'ABCD', '--token', 't', '--amount', '7']);

    expect(commandLine).toEqual({
      isRefusal: false,
      command: { command: 'bid', code: 'ABCD', token: 't', amount: 7 },
    });
  });

  it('refuses a bid the form would refuse, with the field named', () => {
    const commandLine = readCommandLine(['bid', '--code', 'ABCD', '--token', 't', '--amount', '0']);

    expect(commandLine).toMatchObject({
      isRefusal: true,
      reply: { isSuccess: false, output: { error: 'invalid-command' } },
    });
    expect(commandLine).toMatchObject({
      reply: {
        output: {
          issues: [{ path: ['amount'], message: 'Number must be greater than or equal to 1' }],
        },
      },
    });
  });

  it('refuses a winning score the setup does not offer', () => {
    const commandLine = readCommandLine([
      'create',
      '--nickname=Hugo',
      '--avatar=chimp',
      '--maxPlayers=4',
      '--winningScore=150',
    ]);

    expect(commandLine.isRefusal).toBe(true);
  });

  it('refuses a flag the command does not take', () => {
    const commandLine = readCommandLine(['rounds', '--code', 'ABCD', '--token', 't']);

    expect(commandLine.isRefusal).toBe(true);
  });

  it('refuses a flag no command takes rather than failing on it', () => {
    const commandLine = readCommandLine(['show', '--code', 'ABCD', '--colour', 'yellow']);

    expect(commandLine.isRefusal).toBe(true);
  });

  it('answers an unknown command with the usage', () => {
    expect(readCommandLine(['dance'])).toEqual({
      isRefusal: true,
      reply: {
        isSuccess: false,
        output: {
          error: 'invalid-command',
          issues: [
            {
              path: ['command'],
              message:
                "Invalid discriminator value. Expected 'create' | 'join' | 'start' | 'bid' | 'resolve' | 'show' | 'rounds' | 'rematch'",
            },
          ],
          usage: COMMAND_USAGE,
        },
      },
    });
  });
});

describe('selectExitCode', () => {
  it('exits cleanly after a command that succeeded', () => {
    expect(selectExitCode({ isSuccess: true, output: {} })).toBe(0);
  });

  it('exits with a failure after a refusal', () => {
    expect(selectExitCode({ isSuccess: false, output: {} })).toBe(1);
  });
});
