import type { Graph } from '@domain/graph.core';
import { readMemoryGraphSource } from '../memory/memory-pwa.service';
import { projectStoredGraph } from './graph.core';

// @FollowsBlueprint service-read-model
export async function readGraph(date: string | undefined): Promise<Graph> {
  return projectStoredGraph(await readMemoryGraphSource(), date ?? null);
}
