const ARGUMENT_SEPARATOR = '--';
const BLANK = ' ';

export const DEFAULT_APP = 'pragma';
export const DEFAULT_STAGE = 'prod';

export const AGENT_READER_FUNCTION_NAME_OUTPUT = 'AgentReaderFunctionName';

const READABLE_SCHEMA_BY_TARGET: ReadonlyMap<string, string> = new Map([
  ['pragma/prod', 'prod'],
  ['last-loop-lepin/prod', 'prod'],
  ['banana-rush/prod', 'prod'],
]);
const READABLE_TARGETS_LABEL = [...READABLE_SCHEMA_BY_TARGET.keys()]
  .map((target) => `APP=${target.replace('/', ' STAGE=')}`)
  .join(', ');
const PRIVATE_APP = 'talos';
const PRIVATE_APP_REFUSAL =
  'talos holds private data and has no read-only role by design (ADR-0044). Query it through its agent API, POST /api/agent/sql with an agent token (ADR-0039).';

export const READER_NOT_PROVISIONED_REFUSAL =
  `the deployed stack carries no ${AGENT_READER_FUNCTION_NAME_OUTPUT} output, so this application has no reader function to invoke. ` +
  'The production deploy that provisions the reader has not run for this application yet (ADR-0049).';

export type TargetDecision =
  | {
      readonly accepted: true;
      readonly app: string;
      readonly schemaName: string;
      readonly stackName: string;
    }
  | { readonly accepted: false; readonly reason: string };

// @FollowsBlueprint utils-pure-module
export function decideReadTarget(app: string, stage: string): TargetDecision {
  if (app === PRIVATE_APP) return { accepted: false, reason: PRIVATE_APP_REFUSAL };
  const schemaName = READABLE_SCHEMA_BY_TARGET.get(`${app}/${stage}`);
  if (schemaName === undefined) {
    return {
      accepted: false,
      reason: `no read-only role exists for APP=${app} STAGE=${stage}. Readable: ${READABLE_TARGETS_LABEL} (ADR-0044).`,
    };
  }
  return { accepted: true, app, schemaName, stackName: `${app}-${stage}` };
}

export function readQueryArguments(argumentsAfterScript: readonly string[]): string {
  const withoutSeparator =
    argumentsAfterScript[0] === ARGUMENT_SEPARATOR
      ? argumentsAfterScript.slice(1)
      : argumentsAfterScript;
  return withoutSeparator.join(BLANK);
}

export function isAgentReaderFunctionName(value: string): boolean {
  return value !== '' && value !== 'None';
}
