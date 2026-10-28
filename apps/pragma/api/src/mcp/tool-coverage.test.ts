import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { ASSISTANT_TOOLS } from './mcp.controller';
import { compareRoutesWithTools, TOOL_EXCLUSIONS } from './tool-coverage.core';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';
const TEST_SEED_FLAG_ON = '1';
const TOOL_NAME_PATTERN = /^[a-z]+(?:_[a-z]+)+$/;

function readCoverage() {
  const toolRoutes = ASSISTANT_TOOLS.flatMap((tool) => tool.routes);
  return compareRoutesWithTools(createApp().routes, toolRoutes, TOOL_EXCLUSIONS);
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('route and tool coverage', () => {
  beforeAll(() => {
    vi.stubEnv(TEST_SEED_FLAG, TEST_SEED_FLAG_ON);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('serves a tool for every mounted route that is not excluded with a reason', () => {
    expect(readCoverage().routesWithoutTool).toEqual([]);
  });

  it('maps every tool to a route that is mounted', () => {
    expect(readCoverage().toolsWithoutRoute).toEqual([]);
  });

  it('keeps no exclusion for a route that is no longer mounted', () => {
    expect(readCoverage().staleExclusions).toEqual([]);
  });

  it('names each tool verb_noun, and no two tools alike', () => {
    const names = ASSISTANT_TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => !TOOL_NAME_PATTERN.test(name))).toEqual([]);
  });
});
