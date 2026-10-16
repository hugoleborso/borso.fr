import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  memoryAliasTable,
  memoryCitationTable,
  memoryFactTable,
  memoryRelationTable,
} from './memory.schema';

describe('memory graph tables', () => {
  it('keys an alias on its entity, kind and normalised value, and indexes the normalised value', () => {
    const config = getTableConfig(memoryAliasTable);
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'entity_slug',
      'kind',
      'normalized_value',
    ]);
    expect(config.indexes.map((index) => index.config.name)).toEqual([
      'memory_alias_normalized_value_idx',
    ]);
  });

  it('keys a citation on its entity and source reference', () => {
    const config = getTableConfig(memoryCitationTable);
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      'entity_slug',
      'source_ref',
    ]);
    expect(config.indexes.map((index) => index.config.name)).toEqual([
      'memory_citation_source_ref_idx',
    ]);
  });

  it('indexes facts by entity and relations by both ends', () => {
    expect(getTableConfig(memoryFactTable).indexes.map((index) => index.config.name)).toEqual([
      'memory_fact_entity_slug_idx',
    ]);
    expect(getTableConfig(memoryRelationTable).indexes.map((index) => index.config.name)).toEqual([
      'memory_relation_from_slug_idx',
      'memory_relation_to_slug_idx',
    ]);
  });
});
