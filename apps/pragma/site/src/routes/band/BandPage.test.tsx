import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { BandPage } from './BandPage';

const SECTION_PATHS = [
  '/tasks',
  '/members',
  '/instruments',
  '/bars',
  '/compos',
  '/improvements',
  '/account',
];

function renderBandPage(): void {
  render(
    <MemoryRouter initialEntries={['/band']}>
      <BandPage />
    </MemoryRouter>,
  );
}

// @FollowsBlueprint test-component-render
describe('the band page', () => {
  afterEach(() => {
    cleanup();
  });

  it('is a menu of the band sections, Tasks first and the account last', () => {
    renderBandPage();
    const menu = screen.getByRole('navigation', { name: 'The band' });
    const links = within(menu).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(SECTION_PATHS);
    expect(links[0]?.textContent).toBe('Tasks');
  });

  it('holds no task list and no tabs', () => {
    renderBandPage();
    expect(screen.queryByRole('tablist')).toBe(null);
    expect(screen.queryByRole('list', { name: 'My tasks' })).toBe(null);
  });
});
