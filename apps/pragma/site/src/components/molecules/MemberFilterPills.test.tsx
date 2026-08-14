/**
 * UI test for MemberFilterPills — the all-vs-member toggling
 * behaviour. Mirrors the test pattern used in `file-drop.test.tsx`
 * (createRoot + act, no testing-library dep added).
 */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n';
import { type FilterPillMember, MemberFilterPills } from './MemberFilterPills';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ALL_MEMBERS_LABEL_EN = 'All members';

const HUGO_MEMBER: FilterPillMember = { id: 'hugo-id', name: 'Hugo', color: '#d96f5a' };
const PAULINE_MEMBER: FilterPillMember = { id: 'pauline-id', name: 'Pauline', color: '#7a8f5a' };

function findPillByText(container: HTMLElement, label: string): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'));
  return buttons.find((button) => button.textContent.includes(label)) ?? null;
}

function renderPills(root: Root, node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

/**
 * @Blueprint test-component-render
 * @BlueprintName Component Render Test
 * @BlueprintUsage Use for asserting what a user sees and what their click does, rather than what the component called.
 * @BlueprintDescription Mounts the component for real with `createRoot` inside `act`, imports the application's i18n setup so the assertions read the shipped catalogue instead of a stub, and finds each control by its visible text before reading the aria state a screen reader would announce. A fresh container and root are built and torn down per case, so no test inherits the previous tree.
 */
describe('MemberFilterPills', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders one pill per member plus an "All members" pill', () => {
    renderPills(
      root,
      <MemberFilterPills
        members={[HUGO_MEMBER, PAULINE_MEMBER]}
        selectedMemberId={null}
        onChange={vi.fn()}
      />,
    );
    expect(findPillByText(container, ALL_MEMBERS_LABEL_EN)).not.toBeNull();
    expect(findPillByText(container, 'Hugo')).not.toBeNull();
    expect(findPillByText(container, 'Pauline')).not.toBeNull();
  });

  it('marks the "All members" pill as selected when no member is selected', () => {
    renderPills(
      root,
      <MemberFilterPills members={[HUGO_MEMBER]} selectedMemberId={null} onChange={vi.fn()} />,
    );
    const allPill = findPillByText(container, ALL_MEMBERS_LABEL_EN);
    expect(allPill?.getAttribute('aria-selected')).toBe('true');
    const hugoPill = findPillByText(container, 'Hugo');
    expect(hugoPill?.getAttribute('aria-selected')).toBe('false');
  });

  it('marks the member pill as selected when its id is supplied', () => {
    renderPills(
      root,
      <MemberFilterPills
        members={[HUGO_MEMBER, PAULINE_MEMBER]}
        selectedMemberId={PAULINE_MEMBER.id}
        onChange={vi.fn()}
      />,
    );
    expect(findPillByText(container, 'Pauline')?.getAttribute('aria-selected')).toBe('true');
    expect(findPillByText(container, 'Hugo')?.getAttribute('aria-selected')).toBe('false');
    expect(findPillByText(container, ALL_MEMBERS_LABEL_EN)?.getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('calls onChange with the member id when a member pill is clicked', () => {
    const onChange = vi.fn();
    renderPills(
      root,
      <MemberFilterPills members={[HUGO_MEMBER]} selectedMemberId={null} onChange={onChange} />,
    );
    act(() => {
      findPillByText(container, 'Hugo')?.click();
    });
    expect(onChange).toHaveBeenCalledWith(HUGO_MEMBER.id);
  });

  it('calls onChange with null when the "All members" pill is clicked', () => {
    const onChange = vi.fn();
    renderPills(
      root,
      <MemberFilterPills
        members={[HUGO_MEMBER]}
        selectedMemberId={HUGO_MEMBER.id}
        onChange={onChange}
      />,
    );
    act(() => {
      findPillByText(container, ALL_MEMBERS_LABEL_EN)?.click();
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
