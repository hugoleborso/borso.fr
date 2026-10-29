import { describe, expect, it } from 'vitest';
import {
  AGENT_READER_FUNCTION_NAME_OUTPUT,
  DEFAULT_APP,
  DEFAULT_STAGE,
  decideReadTarget,
  isAgentReaderFunctionName,
  READER_NOT_PROVISIONED_REFUSAL,
  readMisplacedApplication,
  readQueryArguments,
} from './read-target.utils';

function refusalFor(app: string, stage: string): string {
  const decision = decideReadTarget(app, stage);
  if (decision.accepted) throw new Error(`expected a refusal for ${app}/${stage}`);
  return decision.reason;
}

describe('decideReadTarget', () => {
  it('accepts the default target and names its schema and stack', () => {
    const decision = decideReadTarget(DEFAULT_APP, DEFAULT_STAGE);
    expect(decision).toStrictEqual({
      accepted: true,
      app: 'pragma',
      schemaName: 'prod',
      stackName: 'pragma-prod',
    });
  });

  it('accepts the other two readable applications', () => {
    expect(decideReadTarget('last-loop-lepin', 'prod').accepted).toBe(true);
    expect(decideReadTarget('banana-rush', 'prod').accepted).toBe(true);
  });

  it('refuses talos by name, pointing at its own agent API', () => {
    expect(refusalFor('talos', 'prod')).toContain('POST /api/agent/sql');
  });

  it('refuses a stage that has no reader, listing the ones that do', () => {
    const reason = refusalFor('pragma', 'preview');
    expect(reason).toContain('APP=pragma STAGE=preview');
    expect(reason).toContain('APP=last-loop-lepin STAGE=prod');
  });

  it('refuses an application nobody provisioned', () => {
    expect(refusalFor('borso-fr', 'prod')).toContain('no read-only role exists');
  });
});

describe('readQueryArguments', () => {
  it('joins the arguments with a blank', () => {
    expect(readQueryArguments(['SELECT', '1'])).toBe('SELECT 1');
  });

  it('drops a leading pnpm argument separator', () => {
    expect(readQueryArguments(['--', 'SELECT', '1'])).toBe('SELECT 1');
  });

  it('is empty when nothing was passed', () => {
    expect(readQueryArguments([])).toBe('');
  });
});

describe('readMisplacedApplication', () => {
  it('names an application passed where the statement belongs', () => {
    expect(readMisplacedApplication(['pragma', 'SELECT 1'])).toBe('pragma');
  });

  it('names it after a pnpm argument separator too', () => {
    expect(readMisplacedApplication(['--', 'last-loop-lepin', 'SELECT 1'])).toBe('last-loop-lepin');
  });

  it('names talos, which the target decision refuses with its own reason', () => {
    expect(readMisplacedApplication(['talos'])).toBe('talos');
  });

  it('accepts a statement', () => {
    expect(readMisplacedApplication(['SELECT 1'])).toBeUndefined();
  });

  it('accepts no argument at all', () => {
    expect(readMisplacedApplication([])).toBeUndefined();
  });
});

describe('isAgentReaderFunctionName', () => {
  it('accepts a name the stack printed', () => {
    expect(isAgentReaderFunctionName('pragma-prod-agent-reader')).toBe(true);
  });

  it('refuses the empty answer and the literal None the CLI prints for a missing output', () => {
    expect(isAgentReaderFunctionName('')).toBe(false);
    expect(isAgentReaderFunctionName('None')).toBe(false);
  });
});

describe('READER_NOT_PROVISIONED_REFUSAL', () => {
  it('names the output it looked for and the decision that creates it', () => {
    expect(READER_NOT_PROVISIONED_REFUSAL).toContain(AGENT_READER_FUNCTION_NAME_OUTPUT);
    expect(READER_NOT_PROVISIONED_REFUSAL).toContain('ADR-0049');
  });
});
