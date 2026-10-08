import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { CommitmentDetail } from '../components/organisms/CommitmentDetail';

// @FollowsBlueprint route-detail-page
export function CommitmentDetailPage(): JSX.Element {
  const { '*': path = '' } = useParams();
  const decodedPath = decodeURI(path);
  return <CommitmentDetail key={decodedPath} path={decodedPath} />;
}
