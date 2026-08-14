import { describe, expect, it } from 'vitest';
import { measureAutoGrowBox } from './auto-grow-textarea.utils';

// @FollowsBlueprint test-pure-unit
describe('measureAutoGrowBox', () => {
  it('grows to the content while it fits under the cap', () => {
    expect(measureAutoGrowBox(88, 667)).toEqual({ heightPx: 88, overflowY: 'hidden' });
  });

  it('caps a chart-sized content at a share of the viewport and scrolls the rest', () => {
    expect(measureAutoGrowBox(3424, 667)).toEqual({ heightPx: 367, overflowY: 'auto' });
  });

  it('keeps a usable cap when the viewport is unknown', () => {
    expect(measureAutoGrowBox(3424, 0)).toEqual({ heightPx: 220, overflowY: 'auto' });
  });

  it('leaves content exactly at the cap uncapped', () => {
    expect(measureAutoGrowBox(220, 100)).toEqual({ heightPx: 220, overflowY: 'hidden' });
  });
});
