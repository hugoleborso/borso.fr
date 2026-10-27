import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const JOB_SEPARATOR = '=';
const ARGUMENT_SEPARATOR = ' ';
const MICROSECONDS_PER_MILLISECOND = 1000;
const FAILURE_EXIT_CODE = 1;
const HOOK_PREFIX = '[pre-commit]';

interface GeneratorJob {
  readonly name: string;
  readonly script: string;
  readonly arguments: readonly string[];
}

interface JobOutcome {
  readonly isPassing: boolean;
  readonly output: string;
  readonly cpuMilliseconds: number;
  readonly wallMilliseconds: number;
}

class ExitRequested extends Error {
  readonly code: number;

  constructor(code: number) {
    super(`process.exit(${String(code)})`);
    this.code = code;
  }
}

function readJob(specification: string): GeneratorJob {
  const separator = specification.indexOf(JOB_SEPARATOR);
  const [script = '', ...jobArguments] = specification
    .slice(separator + 1)
    .split(ARGUMENT_SEPARATOR)
    .filter((word) => word.length > 0);
  return { name: specification.slice(0, separator), script, arguments: jobArguments };
}

function readExitCode(): number {
  const { exitCode } = process;
  if (typeof exitCode === 'number') return exitCode;
  return exitCode === undefined ? 0 : Number(exitCode);
}

async function runJob(job: GeneratorJob): Promise<JobOutcome> {
  const chunks: string[] = [];
  const writeStandardOutput = process.stdout.write.bind(process.stdout);
  const writeStandardError = process.stderr.write.bind(process.stderr);
  const exitProcess = process.exit.bind(process);
  function canWriteAfterCollecting(chunk: string | Uint8Array): boolean {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }
  process.stdout.write = canWriteAfterCollecting;
  process.stderr.write = canWriteAfterCollecting;
  process.exit = (code?: number | string | null): never => {
    throw new ExitRequested(Number(code ?? 0));
  };
  process.argv = [process.argv[0] ?? 'node', job.script, ...job.arguments];
  process.exitCode = undefined;
  const cpuAtStart = process.cpuUsage();
  const wallAtStart = performance.now();
  let isPassing: boolean;
  try {
    await import(pathToFileURL(resolve(job.script)).href);
    isPassing = readExitCode() === 0;
  } catch (error) {
    if (!(error instanceof ExitRequested)) chunks.push(`${String(error)}\n`);
    isPassing = error instanceof ExitRequested && error.code === 0;
  } finally {
    process.stdout.write = writeStandardOutput;
    process.stderr.write = writeStandardError;
    process.exit = exitProcess;
    process.exitCode = undefined;
  }
  const cpu = process.cpuUsage(cpuAtStart);
  return {
    isPassing,
    output: chunks.join(''),
    cpuMilliseconds: Math.round((cpu.user + cpu.system) / MICROSECONDS_PER_MILLISECOND),
    wallMilliseconds: Math.round(performance.now() - wallAtStart),
  };
}

async function main(): Promise<void> {
  const failures: string[] = [];
  for (const job of process.argv.slice(2).map(readJob)) {
    const outcome = await runJob(job);
    const verdict = outcome.isPassing ? 'passed' : 'refused';
    process.stdout.write(outcome.output);
    process.stdout.write(
      `${HOOK_PREFIX} ${job.name}: ${verdict}, ${String(outcome.cpuMilliseconds)} ms CPU, ${String(outcome.wallMilliseconds)} ms wall\n`,
    );
    if (!outcome.isPassing) failures.push(job.name);
  }
  if (failures.length > 0) {
    process.stderr.write(`${HOOK_PREFIX} refused by: ${failures.join(' ')}\n`);
    process.exitCode = FAILURE_EXIT_CODE;
  }
}

await main();
