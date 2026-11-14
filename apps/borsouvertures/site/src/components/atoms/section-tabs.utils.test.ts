import { describe, expect, it } from 'vitest';
import { buildTabId, buildTabPanelId, selectShownSection } from './section-tabs.utils';

// @FollowsBlueprint test-pure-unit
describe('buildTabId', () => {
  it('names the tab after its screen and its section', () => {
    expect(buildTabId('stats', 'retention')).toBe('stats-tab-retention');
  });
});

describe('buildTabPanelId', () => {
  it('names the panel after its screen and its section, apart from its tab', () => {
    expect(buildTabPanelId('stats', 'retention')).toBe('stats-panel-retention');
  });
});

describe('selectShownSection', () => {
  it('shows the section the reader chose while the screen still offers it', () => {
    expect(selectShownSection(['session', 'ahead', 'retention'], 'ahead')).toBe('ahead');
  });

  it('falls back to the first section once the chosen one is no longer offered', () => {
    expect(selectShownSection(['session', 'retention'], 'ahead')).toBe('session');
  });
});
