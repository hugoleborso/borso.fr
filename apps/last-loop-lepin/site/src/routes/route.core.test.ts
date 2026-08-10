import { describe, expect, it } from 'vitest';
import { composeRunnerPath, parseRoute, selectNavigationClassName } from './route.core';

// @FollowsBlueprint test-pure-unit
describe('parseRoute', () => {
  it('reads the root as the spectator screen', () => {
    expect(parseRoute('/')).toEqual({ name: 'spectator', runnerSlug: '' });
  });

  it('reads the explicit spectator path', () => {
    expect(parseRoute('/spectator').name).toBe('spectator');
  });

  it('reads the admin path', () => {
    expect(parseRoute('/admin').name).toBe('admin');
  });

  it('reads the archives path', () => {
    expect(parseRoute('/archives').name).toBe('archives');
  });

  it('reads a runner path and carries the slug', () => {
    expect(parseRoute('/r/alice-martin')).toEqual({ name: 'runner', runnerSlug: 'alice-martin' });
  });

  it('falls through to not found for an unknown path', () => {
    expect(parseRoute('/nowhere')).toEqual({ name: 'not-found', runnerSlug: '' });
  });

  it('falls through to not found for a runner slug with unexpected characters', () => {
    expect(parseRoute('/r/Alice Martin')).toEqual({ name: 'not-found', runnerSlug: '' });
  });
});

describe('selectNavigationClassName', () => {
  it('marks the link of the page in view as active', () => {
    expect(selectNavigationClassName('/archives', 'archives')).toBe('active');
  });

  it('marks the root as the spectator link', () => {
    expect(selectNavigationClassName('/', 'spectator')).toBe('active');
  });

  it('leaves the other links bare', () => {
    expect(selectNavigationClassName('/admin', 'archives')).toBe('');
  });
});

describe('composeRunnerPath', () => {
  it('builds the path of a runner profile', () => {
    expect(composeRunnerPath('alice')).toBe('/r/alice');
  });

  it('escapes a slug that carries a reserved character', () => {
    expect(composeRunnerPath('a/b')).toBe('/r/a%2Fb');
  });
});
