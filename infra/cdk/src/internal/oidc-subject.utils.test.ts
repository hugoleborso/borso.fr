import { describe, expect, it } from 'vitest';
import { githubSubClaims, type SubjectFormat } from './oidc-subject.utils.js';

const NAME_FORMAT: SubjectFormat = { kind: 'name' };
const TALOS_IMMUTABLE_FORMAT: SubjectFormat = {
  kind: 'immutable',
  ownerId: 44852104,
  repositoryId: 1401805496,
};

// @FollowsBlueprint test-pure-unit
describe('githubSubClaims', () => {
  it('builds an environment-scoped sub claim', () => {
    expect(
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: NAME_FORMAT,
        subjects: [{ kind: 'environment', environment: 'prod' }],
      }),
    ).toStrictEqual(['repo:a/b:environment:prod']);
  });

  it('builds a pull_request sub claim', () => {
    expect(
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: NAME_FORMAT,
        subjects: [{ kind: 'pull_request' }],
      }),
    ).toStrictEqual(['repo:a/b:pull_request']);
  });

  it('builds a branch sub claim', () => {
    expect(
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: NAME_FORMAT,
        subjects: [{ kind: 'branch', branch: 'main' }],
      }),
    ).toStrictEqual(['repo:a/b:ref:refs/heads/main']);
  });

  it('builds an "any" sub claim', () => {
    expect(
      githubSubClaims({ repo: 'a/b', subjectFormat: NAME_FORMAT, subjects: [{ kind: 'any' }] }),
    ).toStrictEqual(['repo:a/b:*']);
  });

  it('builds one claim per subject, in order, for a role assumed from several triggers', () => {
    expect(
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: NAME_FORMAT,
        subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: 'main' }],
      }),
    ).toStrictEqual(['repo:a/b:pull_request', 'repo:a/b:ref:refs/heads/main']);
  });

  it('returns nothing for an empty subject list', () => {
    expect(
      githubSubClaims({ repo: 'a/b', subjectFormat: NAME_FORMAT, subjects: [] }),
    ).toStrictEqual([]);
  });

  it('builds the immutable sub claim talos tokens carry, with owner and repository ids', () => {
    expect(
      githubSubClaims({
        repo: 'hugoleborso/talos',
        subjectFormat: TALOS_IMMUTABLE_FORMAT,
        subjects: [{ kind: 'environment', environment: 'prod' }],
      }),
    ).toStrictEqual(['repo:hugoleborso@44852104/talos@1401805496:environment:prod']);
  });

  it('puts the immutable prefix in front of every subject kind', () => {
    expect(
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: { kind: 'immutable', ownerId: 1, repositoryId: 2 },
        subjects: [{ kind: 'pull_request' }, { kind: 'branch', branch: 'main' }, { kind: 'any' }],
      }),
    ).toStrictEqual([
      'repo:a@1/b@2:pull_request',
      'repo:a@1/b@2:ref:refs/heads/main',
      'repo:a@1/b@2:*',
    ]);
  });

  it.each(['a', '/b', 'a/', 'a/b/c', ''])(
    'refuses the repo "%s", which is not owner/name',
    (repo) => {
      expect(() => githubSubClaims({ repo, subjectFormat: NAME_FORMAT, subjects: [] })).toThrow(
        `githubSubClaims: repo must be "owner/name", got "${repo}".`,
      );
    },
  );

  it.each([0, -1, 1.5, Number.NaN])('refuses %s as an owner id', (ownerId) => {
    expect(() =>
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: { kind: 'immutable', ownerId, repositoryId: 2 },
        subjects: [],
      }),
    ).toThrow(`githubSubClaims: ownerId must be a positive integer, got ${ownerId}.`);
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses %s as a repository id', (repositoryId) => {
    expect(() =>
      githubSubClaims({
        repo: 'a/b',
        subjectFormat: { kind: 'immutable', ownerId: 1, repositoryId },
        subjects: [],
      }),
    ).toThrow(`githubSubClaims: repositoryId must be a positive integer, got ${repositoryId}.`);
  });
});
