import { z } from 'zod';

export const seedFixtureSchema = z.object({
  fixture: z.enum(['race-down-to-one-survivor', 'race-finished', 'top-with-dnf-candidates']),
});
