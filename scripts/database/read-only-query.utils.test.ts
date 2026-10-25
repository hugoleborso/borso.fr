import { describe, expect, it } from 'vitest';
import {
  buildReadOnlySessionCommands,
  DEFAULT_APP,
  DEFAULT_STAGE,
  decideReadOnlyQuery,
  decideReadTarget,
  maskLiteralsAndComments,
  readQueryArguments,
  ROW_CAP,
} from './read-only-query.utils';

function blanks(text: string): string {
  return ' '.repeat(text.length);
}

function acceptedStatement(source: string): string {
  const decision = decideReadOnlyQuery(source);
  if (!decision.accepted) throw new Error(`expected acceptance, got: ${decision.reason}`);
  return decision.statement;
}

function refusalReason(source: string): string {
  const decision = decideReadOnlyQuery(source);
  if (decision.accepted) throw new Error(`expected a refusal for: ${source}`);
  return decision.reason;
}

describe('maskLiteralsAndComments', () => {
  it('keeps code and blanks a string literal to the same length', () => {
    expect(maskLiteralsAndComments("SELECT 'x;y' AS a")).toStrictEqual({
      code: `SELECT ${blanks("'x;y'")} AS a`,
      unterminated: undefined,
    });
  });

  it('keeps a doubled quote inside the literal', () => {
    expect(maskLiteralsAndComments("SELECT 'it''s; DROP' FROM t").code).toBe(
      `SELECT ${blanks("'it''s; DROP'")} FROM t`,
    );
  });

  it('reads a backslash as an escape only in an E string', () => {
    expect(maskLiteralsAndComments("SELECT E'a\\'; DROP' x").code).toBe(
      `SELECT E${blanks("'a\\'; DROP'")} x`,
    );
    expect(maskLiteralsAndComments("SELECT e'\\\\' x").code).toBe(`SELECT e${blanks("'\\\\'")} x`);
    expect(maskLiteralsAndComments("SELECT 'a\\' x").code).toBe(`SELECT ${blanks("'a\\'")} x`);
  });

  it('reads a backslash as an escape after an E that follows punctuation', () => {
    expect(maskLiteralsAndComments("SELECT ('a\\'), 1").code).toBe(
      `SELECT (${blanks("'a\\'")}), 1`,
    );
  });

  it('keeps a doubled quote inside an E string before an escaped quote', () => {
    expect(maskLiteralsAndComments("SELECT E'a''\\'' x").code).toBe(
      `SELECT E${blanks("'a''\\''")} x`,
    );
  });

  it('does not read the end of an identifier as an E prefix', () => {
    expect(maskLiteralsAndComments("SELECT x_e'\\' y").code).toBe(`SELECT x_e${blanks("'\\'")} y`);
    expect(maskLiteralsAndComments("SELECT x$e'\\' y").code).toBe(`SELECT x$e${blanks("'\\'")} y`);
    expect(maskLiteralsAndComments("SELECT name'\\' x").code).toBe(
      `SELECT name${blanks("'\\'")} x`,
    );
    expect(maskLiteralsAndComments("SELECT 1e'\\' x").code).toBe(`SELECT 1e${blanks("'\\'")} x`);
  });

  it('blanks a quoted identifier, doubled quotes included', () => {
    expect(maskLiteralsAndComments('SELECT "a""; drop" FROM t').code).toBe(
      `SELECT ${blanks('"a""; drop"')} FROM t`,
    );
  });

  it('reads no backslash escape inside a quoted identifier', () => {
    expect(maskLiteralsAndComments('SELECT "a\\" FROM t').code).toBe(
      `SELECT ${blanks('"a\\"')} FROM t`,
    );
  });

  it('blanks a line comment up to the newline and keeps the newline', () => {
    expect(maskLiteralsAndComments('SELECT 1 -- drop\nFROM t').code).toBe(
      `SELECT 1 ${blanks('-- drop')}\nFROM t`,
    );
    expect(maskLiteralsAndComments('SELECT 1 -- drop').code).toBe(`SELECT 1 ${blanks('-- drop')}`);
  });

  it('blanks nested block comments as one', () => {
    expect(maskLiteralsAndComments('SELECT /* a /* b */ c */ 1').code).toBe(
      `SELECT ${blanks('/* a /* b */ c */')} 1`,
    );
    expect(maskLiteralsAndComments('SELECT /*/ x */ 1').code).toBe(
      `SELECT ${blanks('/*/ x */')} 1`,
    );
  });

  it('blanks a dollar quoted body, tagged or not', () => {
    expect(maskLiteralsAndComments('SELECT $$a;b$$ x').code).toBe(`SELECT ${blanks('$$a;b$$')} x`);
    expect(maskLiteralsAndComments('SELECT $tag$a$$b$tag$ x').code).toBe(
      `SELECT ${blanks('$tag$a$$b$tag$')} x`,
    );
    expect(maskLiteralsAndComments('SELECT $Tag_1$a$Tag_1$ x').code).toBe(
      `SELECT ${blanks('$Tag_1$a$Tag_1$')} x`,
    );
  });

  it('reads a span that opens the source', () => {
    expect(maskLiteralsAndComments("'a'1").code).toBe('   1');
    expect(maskLiteralsAndComments('$$a$$1').code).toBe('     1');
  });

  it('leaves a positional parameter and a dollar inside an identifier alone', () => {
    expect(maskLiteralsAndComments('SELECT $1').code).toBe('SELECT $1');
    expect(maskLiteralsAndComments('SELECT a$b$ FROM t').code).toBe('SELECT a$b$ FROM t');
  });

  it('names the kind of span left open', () => {
    expect(maskLiteralsAndComments("SELECT 'x").unterminated).toBe('string');
    expect(maskLiteralsAndComments("SELECT 'x''").unterminated).toBe('string');
    expect(maskLiteralsAndComments("SELECT E'x\\'").unterminated).toBe('string');
    expect(maskLiteralsAndComments('SELECT "x').unterminated).toBe('quoted identifier');
    expect(maskLiteralsAndComments('SELECT /* x').unterminated).toBe('comment');
    expect(maskLiteralsAndComments('SELECT /* /* x */').unterminated).toBe('comment');
    expect(maskLiteralsAndComments('SELECT /* /* x').unterminated).toBe('comment');
    expect(maskLiteralsAndComments('SELECT $a$ x').unterminated).toBe('dollar-quoted string');
  });

  it('returns the code read before the open span', () => {
    expect(maskLiteralsAndComments("SELECT 'x").code).toBe('SELECT ');
  });
});

describe('decideReadOnlyQuery', () => {
  it('accepts a SELECT and a WITH … SELECT', () => {
    expect(acceptedStatement('SELECT id FROM member')).toBe('SELECT id FROM member');
    expect(acceptedStatement('with recent as (select 1) select * from recent')).toBe(
      'with recent as (select 1) select * from recent',
    );
  });

  it('accepts a SELECT wrapped in parentheses', () => {
    expect(acceptedStatement('(SELECT 1) UNION (SELECT 2)')).toBe('(SELECT 1) UNION (SELECT 2)');
    expect(acceptedStatement('  ( select 1)')).toBe('  ( select 1)');
  });

  it('drops one trailing terminator and anything blank or commented after it', () => {
    expect(acceptedStatement('SELECT 1;')).toBe('SELECT 1');
    expect(acceptedStatement('SELECT 1 ;  \n')).toBe('SELECT 1');
    expect(acceptedStatement('SELECT 1; -- done')).toBe('SELECT 1');
    expect(acceptedStatement('SELECT 1 -- done')).toBe('SELECT 1');
  });

  it('keeps a keyword written inside a value, a quoted name or a comment', () => {
    expect(
      acceptedStatement(
        `SELECT "update", 'DELETE FROM x; DROP TABLE y', $$insert$$ FROM t /* grant */ -- set`,
      ),
    ).toBe(`SELECT "update", 'DELETE FROM x; DROP TABLE y', $$insert$$ FROM t`);
  });

  it('keeps a word that only contains a forbidden keyword', () => {
    expect(acceptedStatement('SELECT updated_at, settings, created FROM member')).toBe(
      'SELECT updated_at, settings, created FROM member',
    );
  });

  it.each([
    'INSERT',
    'UPDATE',
    'DELETE',
    'MERGE',
    'CREATE',
    'ALTER',
    'DROP',
    'GRANT',
    'REVOKE',
    'TRUNCATE',
    'COPY',
    'CALL',
    'DO',
    'SET',
    'RESET',
    'INTO',
    'LOCK',
    'SHARE',
    'BEGIN',
    'START',
    'COMMIT',
    'ROLLBACK',
    'SAVEPOINT',
    'RELEASE',
    'PREPARE',
    'EXECUTE',
    'DEALLOCATE',
    'LISTEN',
    'NOTIFY',
    'UNLISTEN',
    'DISCARD',
    'VACUUM',
    'REFRESH',
    'SET_CONFIG',
  ])('refuses %s anywhere in the statement', (keyword) => {
    expect(refusalReason(`WITH x AS (${keyword.toLowerCase()} y) SELECT 1`)).toBe(
      `the query uses ${keyword}, which a read never needs.`,
    );
  });

  it('names each forbidden keyword once', () => {
    expect(refusalReason('SELECT 1 INTO a FOR UPDATE; ')).toBe(
      'the query uses INTO, UPDATE, which a read never needs.',
    );
    expect(refusalReason('SELECT 1 FOR UPDATE, update')).toBe(
      'the query uses UPDATE, which a read never needs.',
    );
  });

  it('refuses a data modifying CTE', () => {
    expect(refusalReason('WITH gone AS (DELETE FROM member RETURNING *) SELECT * FROM gone')).toBe(
      'the query uses DELETE, which a read never needs.',
    );
  });

  it('refuses more than one statement', () => {
    expect(refusalReason('SELECT 1; SELECT 2')).toBe(
      'the query holds more than one statement; send exactly one.',
    );
    expect(refusalReason('SELECT 1;;')).toBe(
      'the query holds more than one statement; send exactly one.',
    );
  });

  it('refuses a backslash outside a string', () => {
    expect(refusalReason('SELECT 1 \\! rm -rf /')).toBe(
      'the query holds a backslash outside a string, which psql reads as a command.',
    );
  });

  it('refuses a statement that does not start with SELECT or WITH', () => {
    expect(refusalReason('EXPLAIN ANALYZE SELECT 1')).toBe(
      'the query must start with SELECT or WITH, not "explain".',
    );
    expect(refusalReason('TABLE member')).toBe(
      'the query must start with SELECT or WITH, not "table".',
    );
    expect(refusalReason('selection')).toBe(
      'the query must start with SELECT or WITH, not "selection".',
    );
    expect(refusalReason('1')).toBe('the query must start with SELECT or WITH, not "".');
  });

  it('refuses an empty query', () => {
    expect(refusalReason('')).toBe('the query is empty.');
    expect(refusalReason('  ; ')).toBe('the query is empty.');
    expect(refusalReason('-- nothing')).toBe('the query is empty.');
  });

  it('refuses an unterminated literal rather than guessing where it ends', () => {
    expect(refusalReason("SELECT 'x; DROP TABLE member")).toBe(
      'the query has an unterminated string.',
    );
  });
});

describe('decideReadTarget', () => {
  it('defaults to pragma prod', () => {
    expect(DEFAULT_APP).toBe('pragma');
    expect(DEFAULT_STAGE).toBe('prod');
    expect(decideReadTarget(DEFAULT_APP, DEFAULT_STAGE)).toStrictEqual({
      accepted: true,
      app: 'pragma',
      schemaName: 'prod',
      roleName: 'ai_reader_prod',
    });
  });

  it('reads the prod schema of pragma, last-loop-lepin and banana-rush', () => {
    for (const app of ['pragma', 'last-loop-lepin', 'banana-rush']) {
      expect(decideReadTarget(app, 'prod')).toStrictEqual({
        accepted: true,
        app,
        schemaName: 'prod',
        roleName: 'ai_reader_prod',
      });
    }
  });

  it('refuses a stage or an application without a reader', () => {
    const reason =
      'no read-only role exists for APP=pragma STAGE=preview. Readable: APP=pragma STAGE=prod, APP=last-loop-lepin STAGE=prod, APP=banana-rush STAGE=prod (ADR-0044).';
    expect(decideReadTarget('pragma', 'preview')).toStrictEqual({ accepted: false, reason });
    expect(decideReadTarget('borso-fr', 'prod')).toMatchObject({ accepted: false });
    expect(decideReadTarget('toString', 'prod')).toMatchObject({ accepted: false });
    expect(decideReadTarget('pragma', 'constructor')).toMatchObject({ accepted: false });
  });

  it('refuses talos on every stage and points to its agent API', () => {
    const reason =
      'talos holds private data and has no read-only role by design (ADR-0044). Query it through its agent API, POST /api/agent/sql with an agent token (ADR-0039).';
    expect(decideReadTarget('talos', 'prod')).toStrictEqual({ accepted: false, reason });
    expect(decideReadTarget('talos', 'preview')).toStrictEqual({ accepted: false, reason });
  });
});

describe('buildReadOnlySessionCommands', () => {
  it('opens a read only transaction, caps the rows and rolls back', () => {
    expect(ROW_CAP).toBe(200);
    expect(buildReadOnlySessionCommands('SELECT 1 -- x', 5)).toStrictEqual([
      'BEGIN READ ONLY',
      'SELECT * FROM (\nSELECT 1 -- x\n) AS capped_result LIMIT 5',
      'ROLLBACK',
    ]);
  });
});

describe('readQueryArguments', () => {
  it('drops the separator pnpm forwards and joins the rest', () => {
    expect(readQueryArguments(['--', 'SELECT', '1'])).toBe('SELECT 1');
    expect(readQueryArguments(['SELECT 1'])).toBe('SELECT 1');
    expect(readQueryArguments(['SELECT', '--', '1'])).toBe('SELECT -- 1');
    expect(readQueryArguments([])).toBe('');
  });
});
