import { defineConfig } from '@playwright/test';
process.loadEnvFile('.env.local');
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 120000,
  expect: { timeout: 15000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'msedge', headless: true, actionTimeout: 15000, screenshot: 'only-on-failure', trace: 'off' },
  webServer: { command: 'npm.cmd run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
