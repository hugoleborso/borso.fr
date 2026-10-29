export interface SeedStudy {
  readonly memberFirstName: string;
  readonly songTitle: string;
  readonly instrumentName: string;
  readonly daysAgo: number;
}

// @FollowsBlueprint core-lookup-table
export const SEED_STUDIES: readonly SeedStudy[] = [
  { memberFirstName: 'Hugo', songTitle: 'Slow Burn', instrumentName: 'Batterie', daysAgo: 2 },
  { memberFirstName: 'Hugo', songTitle: 'Slow Burn', instrumentName: 'Batterie', daysAgo: 3 },
  { memberFirstName: 'Hugo', songTitle: 'Slow Burn', instrumentName: 'Batterie', daysAgo: 4 },
  { memberFirstName: 'Hugo', songTitle: 'Slow Burn', instrumentName: 'Batterie', daysAgo: 5 },
  { memberFirstName: 'Léa', songTitle: 'Slow Burn', instrumentName: 'Guitare', daysAgo: 0 },
];
