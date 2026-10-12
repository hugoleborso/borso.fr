import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { BrainPageView } from '../components/organisms/BrainPageView';

// @FollowsBlueprint route-detail-page
export function BrainEntryPage(): JSX.Element {
  const { '*': path = 'index' } = useParams();
  return <BrainPageView key={path} path={decodeURI(path)} />;
}
