import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackLink } from './BackLink';

const ORIGIN = 'https://pragma.borso.fr';

function LocationProbe(): JSX.Element {
  const location = useLocation();
  const navigationType = useNavigationType();
  return <p>{`${location.pathname} by ${navigationType}`}</p>;
}

function stubPreviousEntry(path: string): void {
  vi.stubGlobal('navigation', {
    currentEntry: { index: 1 },
    entries: () => [{ url: `${ORIGIN}${path}` }, { url: `${ORIGIN}/members` }],
  });
}

function renderMembersPageAfter(previousPath: string): void {
  render(
    <MemoryRouter initialEntries={[previousPath, '/members']} initialIndex={1}>
      <Routes>
        <Route path="/members" element={<BackLink to="/band" label="Band" />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

// @FollowsBlueprint test-component-render
describe('BackLink', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('stays a real link to the parent page', () => {
    renderMembersPageAfter('/band');
    expect(screen.getByRole('link', { name: 'Band' }).getAttribute('href')).toBe('/band');
  });

  it('goes back in history when the parent page is the previous entry, keeping its query', () => {
    stubPreviousEntry('/band?filter=open');
    renderMembersPageAfter('/band?filter=open');
    fireEvent.click(screen.getByRole('link', { name: 'Band' }));
    expect(screen.getByText('/band by POP')).toBeTruthy();
  });

  it('replaces the page with its parent when it was opened from elsewhere', () => {
    stubPreviousEntry('/catalog');
    renderMembersPageAfter('/catalog');
    fireEvent.click(screen.getByRole('link', { name: 'Band' }));
    expect(screen.getByText('/band by REPLACE')).toBeTruthy();
  });
});
