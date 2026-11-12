import { sentryOrchestrionPlugin } from '@sentry/server-utils/orchestrion/esbuild';
import { build } from 'esbuild';

const serializedBuildOptions = process.argv.at(2);

await build({ ...JSON.parse(serializedBuildOptions), plugins: [sentryOrchestrionPlugin()] });
