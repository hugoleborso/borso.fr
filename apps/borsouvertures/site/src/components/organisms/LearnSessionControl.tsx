import { TreeVisualizationToggle } from '@/components/molecules/TreeVisualizationToggle';
import type { SessionModeControlProps } from './session.types';

// @FollowsBlueprint organism-presentational
export function LearnSessionControl({ visualization }: SessionModeControlProps) {
  return <TreeVisualizationToggle visualization={visualization} />;
}
