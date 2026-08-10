import { TreeVisualizationToggle } from '@/components/molecules/TreeVisualizationToggle';
import type { SessionModeControlProps } from './session.types';

export function LearnSessionControl({ visualization }: SessionModeControlProps) {
  return <TreeVisualizationToggle visualization={visualization} />;
}
