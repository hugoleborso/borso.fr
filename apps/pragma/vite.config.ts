import { fileURLToPath } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const LOCAL_API_PORT = 3001;
const OUTPUT_DIRECTORY = fromHere('./dist');

function readBuildSetting(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

const sentryAuthToken = readBuildSetting('SENTRY_AUTH_TOKEN');

function buildSourceMapUpload(authToken: string): PluginOption {
  const release = readBuildSetting('GITHUB_SHA');
  return sentryVitePlugin({
    authToken,
    org: readBuildSetting('SENTRY_ORG'),
    project: readBuildSetting('SENTRY_PROJECT'),
    telemetry: false,
    ...(release === undefined ? {} : { release: { name: release } }),
    sourcemaps: { filesToDeleteAfterUpload: [`${OUTPUT_DIRECTORY}/**/*.map`] },
  });
}

export default defineConfig({
  root: fromHere('./site'),
  publicDir: fromHere('./site/public'),
  resolve: {
    alias: {
      '@site': fromHere('./site/src'),
      '@api': fromHere('./api/src'),
      '@domain': fromHere('./domain'),
    },
  },
  build: {
    outDir: OUTPUT_DIRECTORY,
    emptyOutDir: true,
    sourcemap: sentryAuthToken === undefined ? false : 'hidden',
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(sentryAuthToken === undefined ? [] : [buildSourceMapUpload(sentryAuthToken)]),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': `http://localhost:${LOCAL_API_PORT}`,
    },
  },
});
