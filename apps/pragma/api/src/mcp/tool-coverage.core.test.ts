import { describe, expect, it } from 'vitest';
import { compareRoutesWithTools, type MountedRoute, TOOL_EXCLUSIONS } from './tool-coverage.core';

const NO_EXCLUSIONS = {};

function route(method: string, path: string): MountedRoute {
  return { method, path };
}

// @FollowsBlueprint test-pure-unit
describe('compareRoutesWithTools', () => {
  it('finds nothing to report when every endpoint has a tool and every tool an endpoint', () => {
    expect(
      compareRoutesWithTools(
        [route('GET', '/api/tasks'), route('POST', '/api/tasks')],
        ['GET /api/tasks', 'POST /api/tasks'],
        NO_EXCLUSIONS,
      ),
    ).toEqual({ routesWithoutTool: [], toolsWithoutRoute: [], staleExclusions: [] });
  });

  it('reports an endpoint no tool serves', () => {
    const coverage = compareRoutesWithTools(
      [route('GET', '/api/tasks'), route('DELETE', '/api/tasks/:id')],
      ['GET /api/tasks'],
      NO_EXCLUSIONS,
    );
    expect(coverage.routesWithoutTool).toEqual(['DELETE /api/tasks/:id']);
  });

  it('reports a tool whose route is no longer mounted', () => {
    const coverage = compareRoutesWithTools(
      [route('GET', '/api/tasks')],
      ['GET /api/tasks', 'GET /api/tasks/:id'],
      NO_EXCLUSIONS,
    );
    expect(coverage.toolsWithoutRoute).toEqual(['GET /api/tasks/:id']);
  });

  it('ignores the middleware entries and reports an endpoint mounted with several handlers once', () => {
    const coverage = compareRoutesWithTools(
      [
        route('ALL', '/api/tasks/*'),
        route('POST', '/api/tasks'),
        route('POST', '/api/tasks'),
        route('PUT', '/api/tasks/:id'),
      ],
      ['PUT /api/tasks/:id'],
      NO_EXCLUSIONS,
    );
    expect(coverage.routesWithoutTool).toEqual(['POST /api/tasks']);
    expect(coverage.staleExclusions).toEqual([]);
  });

  it('excludes one method of a path, and only that method', () => {
    const coverage = compareRoutesWithTools(
      [route('PUT', '/api/me/password'), route('GET', '/api/me/password')],
      [],
      { 'PUT /api/me/password': 'a credential' },
    );
    expect(coverage.routesWithoutTool).toEqual(['GET /api/me/password']);
    expect(coverage.staleExclusions).toEqual([]);
  });

  it('excludes every method of a path with a star', () => {
    const coverage = compareRoutesWithTools(
      [route('GET', '/mcp'), route('POST', '/mcp'), route('POST', '/mcp/other')],
      [],
      { '* /mcp': 'the transport' },
    );
    expect(coverage.routesWithoutTool).toEqual(['POST /mcp/other']);
  });

  it('excludes a path and everything below it with a trailing star, but not a sibling sharing its prefix', () => {
    const coverage = compareRoutesWithTools(
      [
        route('GET', '/api/me/passkeys'),
        route('DELETE', '/api/me/passkeys/:passkeyId'),
        route('GET', '/api/me/passkeysettings'),
      ],
      [],
      { '* /api/me/passkeys/*': 'credentials' },
    );
    expect(coverage.routesWithoutTool).toEqual(['GET /api/me/passkeysettings']);
  });

  it('applies a method to a subtree exclusion', () => {
    const coverage = compareRoutesWithTools(
      [route('GET', '/api/audience/live'), route('POST', '/api/audience/ballot')],
      [],
      { 'GET /api/audience/*': 'public reads' },
    );
    expect(coverage.routesWithoutTool).toEqual(['POST /api/audience/ballot']);
  });

  it('reports an exclusion that matches no mounted endpoint as stale', () => {
    const coverage = compareRoutesWithTools([route('GET', '/api/health')], [], {
      'GET /api/health': 'a probe',
      '* /api/gone/*': 'removed',
      'POST /api/health': 'wrong method',
    });
    expect(coverage.staleExclusions).toEqual(['* /api/gone/*', 'POST /api/health']);
    expect(coverage.routesWithoutTool).toEqual([]);
  });

  it('does not let a middleware entry keep an exclusion alive', () => {
    const coverage = compareRoutesWithTools([route('ALL', '/api/gone/*')], [], {
      '* /api/gone/*': 'removed',
    });
    expect(coverage.staleExclusions).toEqual(['* /api/gone/*']);
  });
});

describe('TOOL_EXCLUSIONS', () => {
  it('gives every excluded route a written reason', () => {
    for (const reason of Object.values(TOOL_EXCLUSIONS)) {
      expect(reason.trim()).not.toBe('');
    }
  });

  it('cannot be changed at run time', () => {
    expect(Object.isFrozen(TOOL_EXCLUSIONS)).toBe(true);
  });
});
