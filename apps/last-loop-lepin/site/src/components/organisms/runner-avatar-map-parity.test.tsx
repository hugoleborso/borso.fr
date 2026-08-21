import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../observability/sentry', () => ({
  recordDiagnosticEvent: () => undefined,
}));

const { RunnerAvatar } = await import('../molecules/RunnerAvatar');
const { avatarHtmlWithPhoto } = await import('./course-map.utils');

interface RunnerFixture {
  readonly slug: string;
  readonly displayName: string;
  readonly photoUrl: string | null;
}

const RUNNERS: readonly (readonly [string, RunnerFixture])[] = [
  ['a runner with no photo', { slug: 'carla', displayName: 'Carla Test', photoUrl: null }],
  [
    'a runner with a photo',
    {
      slug: 'borso',
      displayName: 'Borso Test',
      photoUrl: 'https://photos-cdn.borso.fr/lepin-2026/borso/abc.jpg',
    },
  ],
];

const MAP_AVATAR_PX = 28;

function firstElement(markup: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = markup;
  const element = host.firstElementChild;
  if (!(element instanceof HTMLElement)) throw new Error(`no element in ${markup}`);
  return element;
}

function mapAvatar(runner: RunnerFixture): HTMLElement {
  return firstElement(avatarHtmlWithPhoto(runner));
}

function mapAvatarAfterPhotoFailure(runner: RunnerFixture): HTMLElement {
  const root = mapAvatar(runner);
  const image = root.querySelector('img');
  if (image === null) return root;
  const handler = image.getAttribute('onerror') ?? '';
  const initialsMarkup: unknown = JSON.parse(handler.slice(handler.indexOf('=') + 1));
  if (typeof initialsMarkup !== 'string') {
    throw new TypeError(`no markup in onerror handler ${handler}`);
  }
  return firstElement(initialsMarkup);
}

function componentAvatar(runner: RunnerFixture): HTMLElement {
  const { container } = render(<RunnerAvatar runner={runner} size={MAP_AVATAR_PX} surface="map" />);
  const element = container.firstElementChild;
  if (!(element instanceof HTMLElement)) throw new Error('the avatar component rendered nothing');
  return element;
}

function componentAvatarAfterPhotoFailure(runner: RunnerFixture): HTMLElement {
  const rendered = componentAvatar(runner);
  if (rendered.tagName === 'IMG') fireEvent.error(rendered);
  return componentAvatar(runner).ownerDocument.body.querySelector('span') ?? rendered;
}

function describeAvatar(element: HTMLElement): Record<string, string | null> {
  return {
    isPhoto: String(element.tagName === 'IMG' || element.querySelector('img') !== null),
    initials: element.textContent,
    background: element.style.background,
    runnerSlug: element.getAttribute('data-runner-slug'),
    surface: element.getAttribute('data-surface'),
  };
}

afterEach(cleanup);

describe('the Leaflet div-icon markup and <RunnerAvatar> render the same avatar', () => {
  it.each(RUNNERS)('agrees on photo, slug and surface for %s', (_label, runner) => {
    const fromMap = describeAvatar(mapAvatar(runner));
    const fromComponent = describeAvatar(componentAvatar(runner));
    expect(fromMap.isPhoto).toBe(fromComponent.isPhoto);
    expect(fromMap.runnerSlug).toBe(fromComponent.runnerSlug);
    expect(fromMap.surface).toBe(fromComponent.surface);
  });

  it.each(RUNNERS)(
    'agrees on the initials disc once the photo is gone for %s',
    (_label, runner) => {
      const fromMap = describeAvatar(mapAvatarAfterPhotoFailure(runner));
      const fromComponent = describeAvatar(componentAvatarAfterPhotoFailure(runner));
      expect(fromMap.initials).toBe(fromComponent.initials);
      expect(fromMap.background).toBe(fromComponent.background);
    },
  );
});
