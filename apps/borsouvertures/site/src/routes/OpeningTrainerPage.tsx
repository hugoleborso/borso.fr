import { QueryClientProvider } from '@tanstack/react-query';
import { TrainerShell } from '@/components/organisms/TrainerShell';
import { queryClient } from '@/lib/query-client.setup';

// @FollowsBlueprint organism-shell
export function OpeningTrainerPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrainerShell />
    </QueryClientProvider>
  );
}
