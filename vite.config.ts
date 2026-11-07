import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

function commit(): string {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

const version = readFileSync('VERSION', 'utf8').trim();

/** dist/version.json: lets the release script check which build is live. */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, commit: commit() }) + '\n' });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GIT_COMMIT__: JSON.stringify(commit()),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    assetsInlineLimit: 0,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8099',
      // Multiplayer in dev: npm run mp (server/mp on port 8098).
      '/mp': { target: 'ws://127.0.0.1:8098', ws: true },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
