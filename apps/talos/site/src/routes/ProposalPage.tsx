import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { ProposalView } from '../components/organisms/ProposalView';

// @FollowsBlueprint route-detail-page
export function ProposalPage(): JSX.Element {
  const { slug = '' } = useParams();
  return <ProposalView key={slug} slug={slug} />;
}
