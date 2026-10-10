import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { WeeklyReviewView } from '../components/organisms/WeeklyReviewView';

// @FollowsBlueprint route-detail-page
export function WeeklyReviewPage(): JSX.Element {
  const { week = '' } = useParams();
  return <WeeklyReviewView key={week} week={week} />;
}
