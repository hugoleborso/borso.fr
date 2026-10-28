import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { DEFAULT_IMAGE_LIMIT, renderGallery } from './screenshot-gallery.core';

const listingSchema = z.object({
  Contents: z
    .array(z.object({ Key: z.string(), LastModified: z.string() }))
    .optional()
    .default([]),
});

const argumentsSchema = z.tuple([
  z.string().min(1),
  z.coerce.number().int().positive(),
  z.string().min(1),
]);

const parsedArguments = argumentsSchema.safeParse(process.argv.slice(2));

if (!parsedArguments.success) {
  process.stderr.write(
    [
      'usage: pnpm exec tsx scripts/pr/screenshot-gallery.ts <listing.json> <pr-number> <out.md>',
      '',
      'Reads the output of `aws s3api list-objects-v2 --prefix screenshots/pr-N/`',
      'and writes the sticky "Screenshots" comment body for that pull request.',
      '',
    ].join('\n'),
  );
  process.exit(2);
}

const [listingPath, pullRequestNumber, outputPath] = parsedArguments.data;
const raw: unknown = JSON.parse(readFileSync(listingPath, 'utf8') || '{}');
const listing = listingSchema.parse(raw);

writeFileSync(
  outputPath,
  `${renderGallery({
    pullRequestNumber,
    imageLimit: DEFAULT_IMAGE_LIMIT,
    objects: listing.Contents.map((entry) => ({
      key: entry.Key,
      lastModified: entry.LastModified,
    })),
  })}\n`,
);
