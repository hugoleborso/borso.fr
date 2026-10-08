import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { DraftView } from '../components/organisms/DraftView';

// @FollowsBlueprint route-detail-page
export function DraftPage(): JSX.Element {
  const { slug = '' } = useParams();
  return <DraftView key={slug} slug={slug} />;
}
