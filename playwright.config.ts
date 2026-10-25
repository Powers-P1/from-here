import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

const evidence = resolve(process.env.FROM_HERE_QA_DIR || '../outputs/from-here/product-qa/browser');

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.pw.ts',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  outputDir: resolve(evidence, 'test-results'),
  reporter: [['list'], ['json', { outputFile: resolve(evidence, 'results.json') }]],
  use: {
    baseURL: process.env.FROM_HERE_BASE_URL || 'http://127.0.0.1:4176',
    headless: true,
    viewport: { width: 1259, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  // The coordinating task owns the already-running server. Never start or stop it here.
});
