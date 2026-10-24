import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectClaudeCodeOpener } from './claude-code-opener.adapter';

describe('detectClaudeCodeOpener', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hands the link to the Claude app from the iOS home-screen app', () => {
    vi.stubGlobal('navigator', { standalone: true });
    expect(detectClaudeCodeOpener()).toBe('app');
  });

  it('keeps the web link in an iOS Safari tab', () => {
    vi.stubGlobal('navigator', { standalone: false });
    expect(detectClaudeCodeOpener()).toBe('web');
  });

  it('keeps the web link where the browser knows no home-screen app', () => {
    vi.stubGlobal('navigator', {});
    expect(detectClaudeCodeOpener()).toBe('web');
  });
});
