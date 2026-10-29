import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

function renderHeader(element: JSX.Element): HTMLElement {
  render(<MemoryRouter>{element}</MemoryRouter>);
  const header = screen.getByRole('banner', { hidden: true });
  return header;
}

// @FollowsBlueprint test-component-render
describe('PageHeader', () => {
  afterEach(() => {
    cleanup();
  });

  it('stays pinned at the top while the page scrolls', () => {
    const header = renderHeader(<PageHeader title="Members" />);
    expect(header.hasAttribute('data-page-header')).toBe(true);
    expect(header.classList.contains('sticky')).toBe(true);
    expect(header.classList.contains('top-0')).toBe(true);
  });

  it('carries the back link, the title and the actions, with the pinned rows under them', () => {
    const header = renderHeader(
      <PageHeader
        back={{ to: '/band', label: 'Band' }}
        title="Members"
        actions={<button type="button">Act</button>}
      >
        <div role="tablist" aria-label="Views" />
      </PageHeader>,
    );
    expect(within(header).getByRole('link', { name: 'Band' }).getAttribute('href')).toBe('/band');
    expect(within(header).getByRole('tablist', { name: 'Views' })).toBeTruthy();
    expect(within(header).getByRole('button', { name: 'Act' })).toBeTruthy();
  });

  it('wraps a long title rather than running under the actions', () => {
    const header = renderHeader(
      <PageHeader title="Supercalifragilisticexpialidocious" actions={<span>Edit</span>} />,
    );
    const title = within(header).getByRole('heading', { level: 1 });
    expect(title.classList.contains('wrap-anywhere')).toBe(true);
    expect(title.classList.contains('line-clamp-3')).toBe(true);
    const actions = within(header).getByText('Edit').parentElement;
    expect(actions?.classList.contains('shrink-0')).toBe(true);
    expect(title.contains(actions ?? null)).toBe(false);
  });

  it('draws no back link and no pinned row when none is given', () => {
    const header = renderHeader(<PageHeader title="Band" />);
    expect(within(header).queryByRole('link')).toBeNull();
    expect(header.children).toHaveLength(1);
  });
});
