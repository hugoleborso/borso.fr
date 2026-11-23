// @vitest-environment node
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { API } from 'typescript/unstable/sync';
import { describe, expect, it } from 'vitest';
import {
  assertPresent,
  listResponseShapes,
  readResponseShapeFingerprint,
} from './response-shape.adapter';

const APP_DIRECTORY = process.cwd();
const FIXTURE = {
  projectDirectory: join(APP_DIRECTORY, 'scripts/cache-shape/fixture'),
  configFile: 'fixture.tsconfig.json',
  clientFile: 'fixture-client.d.ts',
  clientExport: 'api',
};
const COMPILER_TIMEOUT_MS = 60_000;

// @FollowsBlueprint test-node-adapter
describe('the response shapes', () => {
  it(
    'writes every read of the client as its route and its body, and closes the compiler',
    () => {
      const closings: number[] = [];
      const shapes = listResponseShapes(FIXTURE, () => {
        const compiler = new API();
        const close = compiler.close.bind(compiler);
        compiler.close = () => {
          closings.push(1);
          close();
        };
        return compiler;
      });
      expect(shapes).toStrictEqual([
        '/members/:id {error:false|true}',
        '/members/:id {id:string}',
        '/songs {anything:unknown;chain:{label:string;next:<cycle>|null};empty:null;from:{x:number};gone:undefined;impossible:never;mood:"calm"|"loud";note?:string|undefined;pair:[number,string];plays:number;size:bigint;tags:[string];title:string;to:{x:number}}',
      ]);
      expect(closings).toHaveLength(1);
    },
    COMPILER_TIMEOUT_MS,
  );

  it(
    'hashes pragma’s shapes, one per line, into twelve hex digits',
    () => {
      const shapes = listResponseShapes({
        projectDirectory: APP_DIRECTORY,
        configFile: 'tsconfig.json',
        clientFile: 'site/src/lib/api.client.ts',
        clientExport: 'api',
      });
      const expected = createHash('sha256').update(shapes.join('\n')).digest('hex').slice(0, 12);
      expect(readResponseShapeFingerprint(APP_DIRECTORY)).toBe(expected);
      expect(expected).toMatch(/^[0-9a-f]{12}$/);
    },
    COMPILER_TIMEOUT_MS,
  );

  it('names what the compiler did not answer', () => {
    expect(assertPresent('streaks')).toBe('streaks');
    expect(() => assertPresent(undefined)).toThrow(
      'response shape: the compiler left a type unanswered',
    );
  });
});
