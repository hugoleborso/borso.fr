/**
 * The shape of a committed architecture model, parsed rather than trusted.
 *
 * Two readers need it: the diff, which compares two of them, and the generator,
 * which reads the target branch's model to colour a diff page. Neither can
 * import the other — the diff runs its own `main()` at module load — so the
 * schema lives here.
 */

import { z } from 'zod';

export const routeSchema = z.object({
  id: z.string(),
  context: z.string(),
  steps: z.array(z.string()),
  tables: z.array(z.string()),
  externals: z.array(z.string()),
  callerCount: z.number(),
  unreached: z.boolean(),
});

export const fileSchema = z.object({
  path: z.string(),
  digest: z.string(),
  container: z.string(),
  layer: z.string(),
  context: z.string(),
  feature: z.string().nullable(),
  exports: z.array(z.string()),
  imports: z.array(z.string()),
  blueprints: z.array(z.string()),
  followsBlueprints: z.array(z.string()),
});

export const architectureModelSchema = z.object({
  application: z.string(),
  containers: z.array(z.object({ id: z.string(), name: z.string(), fileCount: z.number() })),
  externals: z.array(
    z.object({ id: z.string(), name: z.string(), reachedFrom: z.array(z.string()) }),
  ),
  files: z.array(fileSchema),
  routes: z.array(routeSchema),
  blueprints: z.array(z.object({ id: z.string(), file: z.string(), followerCount: z.number() })),
});

export type ArchitectureModel = z.infer<typeof architectureModelSchema>;
export type RouteEntry = z.infer<typeof routeSchema>;
export type FileEntry = z.infer<typeof fileSchema>;

/**
 * What one application's diff run found, written beside its page.
 *
 * The index needs every application's counts and the workflow builds the diffs
 * one application per invocation, so the folder is where the runs meet. Parsed
 * rather than trusted for the same reason the model is: a stale file from an
 * earlier shape would otherwise render as `undefined` on the page.
 */
export const diffSummarySchema = z.object({
  counts: z.array(z.object({ label: z.string(), value: z.number() })),
});

export type DiffSummary = z.infer<typeof diffSummarySchema>;
