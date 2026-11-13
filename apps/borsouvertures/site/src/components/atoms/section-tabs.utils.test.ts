import { describe, expect, it } from 'vitest';
import { buildTabId, buildTabPanelId } from './section-tabs.utils';

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
