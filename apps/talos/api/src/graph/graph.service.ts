import { buildGraph, type Graph, parseGraphRelations, projectPageNode } from '@domain/graph.core';
import { summarizePage } from '@domain/markdown-page.core';
import { readContentFile, readPageCorpus } from '../content/content.service';
import { isMemoryInDatabase } from '../memory/memory-cutover.service';
import { readMemoryGraphSource } from '../memory/memory-pwa.service';
import { projectStoredGraph } from './graph.core';

const GRAPH_PATH = 'etat/graphe.jsonl';

// @FollowsBlueprint service-read-model
export async function readGraph(date: string | undefined): Promise<Graph> {
  if (await isMemoryInDatabase()) {
    return projectStoredGraph(await readMemoryGraphSource(), date ?? null);
  }
  const [corpus, relations] = await Promise.all([readPageCorpus(), readContentFile(GRAPH_PATH)]);
  const nodes = corpus.map((page) => projectPageNode(summarizePage(page.path, page.markdown)));
  return buildGraph(nodes, parseGraphRelations(relations ?? ''), date ?? null);
}
