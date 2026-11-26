import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { PASS } from '../check.core.ts';
import {
  knowledgeTriggersBeforeTool as knowledgeTriggers,
  parseLookup,
  renderKnowledgeContext,
  splitPathTokens,
  toJavaScriptPattern,
} from './knowledge-triggers.core.ts';

const LOOKUP = '.claude/knowledge-triggers.json';
const NO_TRIGGERS = { paths: [], commands: [], output: [] };
const BROWSER = {
  ...NO_TRIGGERS,
  path: 'docs/knowledge/browser.md',
  summary: 'Browser traps.',
  commands: ['\\bagent-browser\\b'],
  output: ['daemon already running'],
};
const INVARIANTS = {
  ...NO_TRIGGERS,
  path: 'docs/knowledge/invariants.md',
  summary: 'Invariants headings.',
  paths: ['(?:^|/)apps/[^/]*/(?:[^/]+/)*INVARIANTS\\.md$'],
};
const UPLOADS = {
  ...NO_TRIGGERS,
  path: 'docs/knowledge/uploads.md',
  summary: 'No uploads bucket.',
  output: ['UPLOADS_BUCKET not set'],
};
const BROKEN = { ...NO_TRIGGERS, path: 'docs/knowledge/broken.md', summary: 'x', output: ['('] };
const ALSO_DAEMON = ['a', 'b', 'c'].map((name) => ({
  ...NO_TRIGGERS,
  path: `docs/knowledge/daemon-${name}.md`,
  summary: `Daemon ${name}.`,
  output: ['daemon'],
}));
const LOOKUP_TEXT = JSON.stringify({ entries: [BROKEN, BROWSER, INVARIANTS, UPLOADS] });
const ANYTHING = {
  ...NO_TRIGGERS,
  path: 'docs/knowledge/anything.md',
  summary: 'Matches any subject, the empty one included.',
  commands: ['^'],
  output: ['^'],
};
const ANY_PATH = { ...NO_TRIGGERS, path: 'docs/knowledge/any-path.md', summary: 'p', paths: ['.'] };
const ALONE = {
  ...NO_TRIGGERS,
  path: 'docs/knowledge/alone.md',
  summary: 'One stream alone.',
  output: ['^\\nalone$', '^alone$'],
};

interface Call {
  readonly command: string;
  readonly args: readonly string[];
  readonly input: string | undefined;
}

interface FakeWorld {
  readonly world: HookWorld;
  readonly calls: Call[];
  readonly files: Map<string, string>;
  readonly reads: unknown[];
}

const OK: CommandResult = { status: 0, stdout: '', stderr: '' };
const FAILED: CommandResult = { status: 1, stdout: '', stderr: '' };

function createWorld(
  options: {
    readonly files?: Readonly<Record<string, string>>;
    readonly environment?: Readonly<Record<string, string>>;
    readonly results?: Readonly<Record<string, CommandResult>>;
    readonly compiledLookup?: string;
  } = {},
): FakeWorld {
  const files = new Map(Object.entries(options.files ?? { [LOOKUP]: LOOKUP_TEXT }));
  const calls: Call[] = [];
  const reads: unknown[] = [];
  const world: HookWorld = {
    projectDirectory: '/repo',
    readEnvironment: (name) => options.environment?.[name],
    readText: (path) => {
      reads.push(path);
      return files.get(path) ?? null;
    },
    run: (command, args, input) => {
      calls.push({ command, args, input });
      if (command === 'python3' && options.compiledLookup !== undefined) {
        files.set(LOOKUP, options.compiledLookup);
      }
      if (command === 'tee') files.set(args[1] ?? '', (files.get(args[1] ?? '') ?? '') + input);
      return options.results?.[command] ?? OK;
    },
  };
  return { world, calls, files, reads };
}

function lookupOf(...entries: readonly object[]): FakeWorld {
  return createWorld({ files: { [LOOKUP]: JSON.stringify({ entries }) } });
}

function bash(command: string, extra: Partial<HookInput> = {}): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, ...extra };
}

function printed(response: unknown, extra: Partial<HookInput> = {}): HookInput {
  return {
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'x' },
    tool_response: response,
    ...extra,
  };
}

function contextOf(input: HookInput, fake: FakeWorld = createWorld()): string | null {
  const verdict = knowledgeTriggers.run(input, fake.world);
  return verdict.kind === 'context' ? verdict.text : null;
}

// @FollowsBlueprint test-pure-unit
describe('toJavaScriptPattern reads a trigger as jq reads it', () => {
  it('lets a dot match a carriage return and never a newline', () => {
    expect(toJavaScriptPattern('a.b').test('a\rb')).toBe(true);
    expect(toJavaScriptPattern('a.b').test('a\nb')).toBe(false);
  });

  it('lets a dollar match before one final newline only', () => {
    expect(toJavaScriptPattern('a$').test('a\n')).toBe(true);
    expect(toJavaScriptPattern('a$').test('a\nb')).toBe(false);
  });

  it('keeps a dot, a dollar and an escape inside a class literal', () => {
    expect(toJavaScriptPattern('x[.$]').test('x$')).toBe(true);
    expect(toJavaScriptPattern('x[\\]]y').test('x]y')).toBe(true);
    expect(toJavaScriptPattern('x[^.]').test('x\n')).toBe(true);
  });

  it('keeps an escaped dot literal', () => {
    expect(toJavaScriptPattern('a\\.b').test('a-b')).toBe(false);
  });

  it('reads a leading (?i) as a case-insensitive flag', () => {
    expect(toJavaScriptPattern('(?i)agent type').test('Agent Type')).toBe(true);
  });
});

describe('parseLookup', () => {
  it('reads every well-formed entry and defaults a missing trigger list to none', () => {
    const text = JSON.stringify({
      entries: [
        null,
        { path: 'p', summary: 's', paths: ['x', 3] },
        { path: 1 },
        { path: 'no summary' },
        { summary: 'no path' },
        'junk',
      ],
    });

    expect(parseLookup(text)).toEqual([
      { path: 'p', summary: 's', paths: ['x'], commands: [], output: [] },
    ]);
  });

  it('reads a lookup that is not JSON, or has no entries, as empty', () => {
    expect(parseLookup('{')).toEqual([]);
    expect(parseLookup('{"entries":{}}')).toEqual([]);
    expect(parseLookup(null)).toEqual([]);
  });
});

describe('splitPathTokens splits as tr and jq -R did', () => {
  it('keeps a leading empty token and drops a trailing one', () => {
    expect(splitPathTokens(';a b|c;')).toEqual(['', 'a', 'b', 'c']);
  });

  it('reads an empty command as no token', () => {
    expect(splitPathTokens('')).toEqual([]);
  });

  it('keeps a last token that is not empty', () => {
    expect(splitPathTokens('a b')).toEqual(['a', 'b']);
  });
});

describe('renderKnowledgeContext', () => {
  it('lists the selected entries in lookup order, plural when there are several', () => {
    expect(renderKnowledgeContext([BROWSER, UPLOADS], [UPLOADS.path, BROWSER.path], 'output')).toBe(
      '[knowledge] What that call printed matches knowledge entries written after the same moment' +
        ' cost a session before. Read them before concluding anything:\n\n' +
        '- `docs/knowledge/browser.md`: Browser traps.\n- `docs/knowledge/uploads.md`: No uploads bucket.',
    );
  });
});

describe('knowledgeTriggers, the moments it reads', () => {
  it('names the file a Write targets', () => {
    const input: HookInput = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/repo/apps/pragma/site/src/routes/concerts/INVARIANTS.md' },
    };

    expect(contextOf(input)).toBe(
      '[knowledge] The file this call writes matches a knowledge entry written after the same' +
        ' moment cost a session before. Read it before concluding anything:\n\n' +
        '- `docs/knowledge/invariants.md`: Invariants headings.',
    );
  });

  it('falls back to the notebook a NotebookEdit targets', () => {
    const input: HookInput = {
      hook_event_name: 'PreToolUse',
      tool_name: 'NotebookEdit',
      tool_input: { file_path: null, notebook_path: 'apps/x/INVARIANTS.md' },
    };

    expect(contextOf(input)).toContain('invariants.md');
  });

  it('skips a path that is false, as jq // did', () => {
    const input: HookInput = {
      hook_event_name: 'PreToolUse',
      tool_name: 'NotebookEdit',
      tool_input: { file_path: false, notebook_path: 'apps/x/INVARIANTS.md' },
    };

    expect(contextOf(input)).toContain('invariants.md');
  });

  it('reads a write only before it runs', () => {
    const input: HookInput = {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: 'apps/x/INVARIANTS.md' },
    };

    expect(contextOf(input)).toBeNull();
  });

  it('reads a path that is not a string as jq -r printed it', () => {
    const input: HookInput = {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 7 },
    };

    expect(contextOf(input)).toBeNull();
  });

  it('matches a command it is about to run', () => {
    expect(contextOf(bash('agent-browser open x'))).toContain(
      '[knowledge] The command about to run matches a knowledge entry',
    );
  });

  it('ignores a command that only quotes another one or writes it in a heredoc', () => {
    expect(contextOf(bash('echo "agent-browser open"'))).toBeNull();
    expect(contextOf(bash("cat <<'EOF'\nagent-browser open\nEOF\n"))).toBeNull();
  });

  it('matches a path a command names, because git mv rewrites a file with no Write', () => {
    expect(contextOf(bash('git mv apps/a/INVARIANTS.md apps/a/B.md'))).toContain('invariants.md');
  });

  it('passes a command that matches nothing, and a call with no command', () => {
    expect(contextOf(bash('ls -la'))).toBeNull();
    expect(contextOf({ hook_event_name: 'PreToolUse', tool_name: 'Bash' })).toBeNull();
  });

  it('passes an empty subject before matching it, even against a pattern that matches anything', () => {
    expect(
      contextOf({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, lookupOf(ANYTHING)),
    ).toBeNull();
    expect(contextOf(bash('\n\n'), lookupOf(ANYTHING))).toBeNull();
    expect(contextOf(printed({ stdout: 1 }), lookupOf(ANYTHING))).toBeNull();
  });

  it('reads a call with no response as printing null', () => {
    expect(
      contextOf({ hook_event_name: 'PostToolUse', tool_name: 'Bash' }, lookupOf(ANYTHING)),
    ).toBe(renderKnowledgeContext([ANYTHING], [ANYTHING.path], 'output'));
  });

  it('matches a command only when what it runs, outside its strings, matches too', () => {
    const quoted = {
      ...NO_TRIGGERS,
      path: 'docs/knowledge/q.md',
      summary: 'q',
      commands: ['a""b'],
    };

    expect(contextOf(bash('echo a"x"b'), lookupOf(quoted))).toBeNull();
  });

  it('reads the path tokens of a command only, never of what a call printed', () => {
    expect(contextOf(printed('apps/a/INVARIANTS.md'))).toBeNull();
    expect(contextOf(printed('hello'), lookupOf(ANY_PATH))).toBeNull();
  });

  it('drops every trailing line break of the subject, and only those', () => {
    const entries = [
      { ...NO_TRIGGERS, path: 'docs/knowledge/done.md', summary: 'd', output: ['^done$'] },
      { ...NO_TRIGGERS, path: 'docs/knowledge/kept.md', summary: 'k', output: ['done\\n'] },
      { ...NO_TRIGGERS, path: 'docs/knowledge/joined.md', summary: 'j', output: ['onetwo'] },
    ];

    expect(contextOf(printed('done\n\n'), lookupOf(...entries))).toBe(
      renderKnowledgeContext(entries, ['docs/knowledge/done.md'], 'output'),
    );
    expect(contextOf(printed('one\ntwo\n'), lookupOf(...entries))).toBeNull();
  });

  it('matches what a Bash call printed on either stream', () => {
    expect(contextOf(printed({ stdout: 'UPLOADS_BUCKET not set' }))).toContain(
      '[knowledge] What that call printed',
    );
    expect(contextOf(printed({ stderr: 'UPLOADS_BUCKET not set\n' }))).toContain('uploads.md');
  });

  it('reads a missing stream as empty', () => {
    expect(contextOf(printed({ stderr: 'alone' }), lookupOf(ALONE))).toContain('alone.md');
    expect(contextOf(printed({ stdout: 'alone' }), lookupOf(ALONE))).toContain('alone.md');
  });

  it('reads a response with neither stream as its JSON', () => {
    expect(contextOf(printed({ text: 'UPLOADS_BUCKET not set' }))).toContain('uploads.md');
  });

  it('reads a response whose streams are not strings as nothing printed', () => {
    expect(contextOf(printed({ stdout: 1, stderr: 'UPLOADS_BUCKET not set' }))).toBeNull();
    expect(contextOf(printed({ stdout: 'UPLOADS_BUCKET not set', stderr: [] }))).toBeNull();
  });

  it('reads a string response, and any other response as its JSON', () => {
    expect(contextOf(printed('daemon already running'))).toContain('browser.md');
    expect(contextOf(printed([{ text: 'UPLOADS_BUCKET not set' }]))).toContain('uploads.md');
  });

  it('reads the error of a failed Bash call before its response', () => {
    const input = printed('nothing', {
      hook_event_name: 'PostToolUseFailure',
      error: 'UPLOADS_BUCKET not set',
    });

    expect(contextOf(input)).toContain('uploads.md');
  });

  it('matches an MCP call after it ran, never after it failed', () => {
    const mcp = printed('UPLOADS_BUCKET not set', { tool_name: 'mcp__github__get_job_logs' });

    expect(contextOf(mcp)).toContain('uploads.md');
    expect(contextOf({ ...mcp, hook_event_name: 'PostToolUseFailure' })).toBeNull();
  });

  it('reads what no other tool printed, and no call without a tool name', () => {
    const { tool_name: _toolName, ...nameless } = printed('UPLOADS_BUCKET not set');

    expect(contextOf(printed('UPLOADS_BUCKET not set', { tool_name: 'Read' }))).toBeNull();
    expect(contextOf(nameless)).toBeNull();
  });

  it('skips output read from a markdown document, which only quotes the error', () => {
    const input = printed('UPLOADS_BUCKET not set', { tool_input: { command: 'cat a.md' } });

    expect(contextOf(input)).toBeNull();
  });

  it('reads a call with no tool input, and one with no response, as printing null', () => {
    expect(contextOf({ hook_event_name: 'PostToolUse', tool_name: 'Bash' })).toBeNull();
  });

  it('cuts an output only past forty thousand characters, joining its head and tail', () => {
    const entries = [
      { ...NO_TRIGGERS, path: 'docs/knowledge/whole.md', summary: 'w', output: ['XY', 'XMY'] },
      { ...NO_TRIGGERS, path: 'docs/knowledge/cut.md', summary: 'c', output: ['X\\nY'] },
    ];
    const longest = `${'a'.repeat(19999)}XY${'b'.repeat(19999)}`;
    const tooLong = `${'a'.repeat(19999)}XMY${'b'.repeat(19999)}`;

    expect(contextOf(printed(longest), lookupOf(...entries))).toBe(
      renderKnowledgeContext(entries, ['docs/knowledge/whole.md'], 'output'),
    );
    expect(contextOf(printed(tooLong), lookupOf(...entries))).toBe(
      renderKnowledgeContext(entries, ['docs/knowledge/cut.md'], 'output'),
    );
  });

  it('keeps the head and the tail of a very long output', () => {
    const long = `UPLOADS_BUCKET not set${'x'.repeat(50000)}daemon already running`;

    expect(contextOf(printed(long))).toContain('browser.md');
    expect(contextOf(printed(long))).toContain('uploads.md');
  });

  it('reads nothing for another tool or another event, and touches nothing', () => {
    const fake = createWorld();

    expect(knowledgeTriggers.run({ hook_event_name: 'PreToolUse' }, fake.world)).toBe(PASS);
    expect(knowledgeTriggers.run({ hook_event_name: 'Stop', tool_name: 'Bash' }, fake.world)).toBe(
      PASS,
    );
    expect(fake.calls).toEqual([]);
  });
});

describe('knowledgeTriggers, the lookup it reads', () => {
  it('compiles a missing lookup when the knowledge folder exists', () => {
    const fake = createWorld({ files: {}, compiledLookup: LOOKUP_TEXT });

    expect(contextOf(bash('agent-browser open'), fake)).toContain('browser.md');
    expect(fake.calls).toEqual([
      { command: 'test', args: ['-d', 'docs/knowledge'], input: undefined },
      {
        command: 'python3',
        args: ['scripts/knowledge-triggers.py', 'compile'],
        input: undefined,
      },
    ]);
  });

  it('reads the lookup as it is when no entry is newer, without compiling it', () => {
    const fake = createWorld({ compiledLookup: JSON.stringify({ entries: [UPLOADS] }) });

    expect(contextOf(bash('agent-browser open'), fake)).toContain('browser.md');
    expect(fake.calls.map((call) => call.command)).toEqual(['find']);
  });

  it('passes when there is no knowledge folder, or the compile fails', () => {
    expect(
      contextOf(bash('agent-browser'), createWorld({ files: {}, results: { test: FAILED } })),
    ).toBeNull();
    expect(
      contextOf(
        bash('agent-browser'),
        createWorld({ results: { find: { ...OK, stdout: 'x' }, python3: FAILED } }),
      ),
    ).toBeNull();
  });

  it('compiles again when an entry is newer than the lookup', () => {
    const fake = createWorld({
      results: { find: { ...OK, stdout: 'docs/knowledge/x.md\n' } },
      compiledLookup: JSON.stringify({ entries: [UPLOADS] }),
    });

    expect(contextOf(printed('daemon already running'), fake)).toBeNull();
    expect(fake.calls[0]?.args).toEqual([
      'docs/knowledge',
      '(',
      '-path',
      'docs/knowledge',
      '-o',
      '-name',
      '*.md',
      ')',
      '-newer',
      LOOKUP,
      '-print',
      '-quit',
    ]);
  });

  it('passes when the knowledge folder is gone, which find reports as a failure', () => {
    expect(contextOf(bash('agent-browser'), createWorld({ results: { find: FAILED } }))).toBeNull();
  });

  it('skips a pattern that does not compile instead of failing the call', () => {
    expect(contextOf(printed('daemon already running ('))).toContain('browser.md');
  });
});

describe('knowledgeTriggers, once per session and agent', () => {
  it('remembers what it showed in a file named after the session and agent', () => {
    const fake = createWorld({ environment: { TMPDIR: '/t' } });
    const input = bash('agent-browser', { session_id: 's1', agent_id: 'a/b c' });

    expect(contextOf(input, fake)).toContain('browser.md');
    expect(fake.files.get('/t/knowledge-triggers-s1-abc.seen')).toBe('docs/knowledge/browser.md\n');
    expect(knowledgeTriggers.run(input, fake.world)).toBe(PASS);
    expect(fake.files.get('/t/knowledge-triggers-s1-abc.seen')).toBe('docs/knowledge/browser.md\n');
    expect(fake.calls.filter((call) => call.command !== 'find')).toEqual([
      { command: 'touch', args: ['/t/knowledge-triggers-s1-abc.seen'], input: undefined },
      {
        command: 'tee',
        args: ['-a', '/t/knowledge-triggers-s1-abc.seen'],
        input: 'docs/knowledge/browser.md\n',
      },
      { command: 'touch', args: ['/t/knowledge-triggers-s1-abc.seen'], input: undefined },
    ]);
  });

  it('names the file after the agent alone when the session id is empty', () => {
    const fake = createWorld();
    contextOf(bash('agent-browser', { session_id: '', agent_id: 'a' }), fake);

    expect(fake.files.get('/tmp/knowledge-triggers-a.seen')).toBe('docs/knowledge/browser.md\n');
  });

  it('opens no memory file for a call that matches nothing', () => {
    const fake = createWorld();
    contextOf(bash('ls', { session_id: 's' }), fake);

    expect(fake.calls.map((call) => call.command)).toEqual(['find']);
  });

  it('shows at most three entries and keeps the rest for the next match', () => {
    const fake = createWorld({
      files: { [LOOKUP]: JSON.stringify({ entries: [BROWSER, ...ALSO_DAEMON] }) },
    });
    const input = printed('daemon already running', { session_id: 's' });

    expect(contextOf(input, fake)).not.toContain('daemon-c.md');
    expect(contextOf(input, fake)).toContain('daemon-c.md');
    expect(fake.files.get('/tmp/knowledge-triggers-s.seen')).toBe(
      'docs/knowledge/browser.md\ndocs/knowledge/daemon-a.md\ndocs/knowledge/daemon-b.md\n' +
        'docs/knowledge/daemon-c.md\n',
    );
  });

  it('keeps no memory when there is no session, or the file cannot be created', () => {
    const noSession = createWorld();
    const cannotTouch = createWorld({ results: { touch: FAILED } });

    expect(contextOf(bash('agent-browser', { session_id: '' }), noSession)).toContain('browser');
    expect(contextOf(bash('agent-browser', { session_id: 's' }), cannotTouch)).toContain('browser');
    expect([...noSession.calls, ...cannotTouch.calls].map((call) => call.command)).not.toContain(
      'tee',
    );
    expect(noSession.reads).toEqual([LOOKUP]);
  });
});
