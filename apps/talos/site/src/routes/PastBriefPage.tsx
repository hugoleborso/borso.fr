import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { PastBriefView } from '../components/organisms/PastBriefView';

// @FollowsBlueprint route-detail-page
export function PastBriefPage(): JSX.Element {
  const { date = '' } = useParams();
  return <PastBriefView key={date} date={date} />;
}
