import { buildGraph, type Graph, parseGraphRelations } from '@domain/graph.core';
import { summarizePage } from '@domain/markdown-page.core';
import { readContentFile, readPageCorpus } from '../content/content.service';

const GRAPH_PATH = 'etat/graphe.jsonl';

// @FollowsBlueprint service-read-model
export async function readGraph(date: string | undefined): Promise<Graph> {
  const [corpus, relations] = await Promise.all([readPageCorpus(), readContentFile(GRAPH_PATH)]);
  const nodes = corpus.map((page) => {
    const summary = summarizePage(page.path, page.markdown);
    return { id: summary.path, title: summary.title, type: summary.type };
  });
  return buildGraph(nodes, parseGraphRelations(relations ?? ''), date ?? null);
}
