import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findGate, GATE_DEFINITIONS } from './gates.core';

describe('findGate', () => {
  it('finds a gate by name', () => {
    expect(findGate('stryker')?.token).toBe('stryker run');
  });

  it('returns null for a name no gate carries', () => {
    expect(findGate('vibes')).toBeNull();
  });
});

describe('GATE_DEFINITIONS', () => {
  it('names each gate once', () => {
    const names = GATE_DEFINITIONS.map((gate) => gate.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every gate at least one site, because a gate that runs nowhere is prose', () => {
    for (const gate of GATE_DEFINITIONS) expect(gate.sites.length).toBeGreaterThan(0);
  });

  /**
   * The registry is the claim and the checkout is the fact. This test is what
   * makes removing a step from CI fail here rather than silently weaken a
   * standard that cites the gate.
   */
  it('finds each gate running in every site it claims', () => {
    for (const gate of GATE_DEFINITIONS) {
      for (const site of gate.sites) {
        expect(readFileSync(site, 'utf8'), `${gate.name} in ${site}`).toContain(gate.token);
      }
    }
  });
});
