import { describe, expect, it } from 'vitest';
import { isEndedByTheSystem, isPermissionRefusal, isStoppedOnReturn } from './recorder.core';

// @FollowsBlueprint test-pure-unit
describe('isPermissionRefusal', () => {
  it('reads a refused or insecure microphone as a refusal', () => {
    expect(isPermissionRefusal(new DOMException('no', 'NotAllowedError'))).toBe(true);
    expect(isPermissionRefusal(new DOMException('no', 'SecurityError'))).toBe(true);
  });

  it('reads any other failure as something else', () => {
    expect(isPermissionRefusal(new DOMException('none', 'NotFoundError'))).toBe(false);
    expect(isPermissionRefusal(new Error('NotAllowedError'))).toBe(false);
  });
});

describe('isEndedByTheSystem', () => {
  it('reads a recording that ended with nobody asking as ended by the system', () => {
    expect(isEndedByTheSystem(0)).toBe(true);
  });

  it('reads a recording the member stopped as not ended by the system', () => {
    expect(isEndedByTheSystem(1)).toBe(false);
  });
});

describe('isStoppedOnReturn', () => {
  it('finds a recorder that stopped while the page was away once the page is visible again', () => {
    expect(isStoppedOnReturn('visible', true)).toBe(true);
  });

  it('waits for the page to be visible before deciding', () => {
    expect(isStoppedOnReturn('hidden', true)).toBe(false);
  });

  it('leaves a recorder that is still running alone', () => {
    expect(isStoppedOnReturn('visible', false)).toBe(false);
  });
});
