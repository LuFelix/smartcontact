import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.join(__dirname),
  timeout: 90_000,
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  testMatch: ['e2e/**/*.spec.ts', 'e2e/**/*.spec.cjs'],
  testIgnore: ['**/src/**', '**/backend/**', '**/node_modules/**'],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iPhone 13', use: { ...devices['iPhone 13'], baseURL: 'http://localhost:4200' } },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4200' } },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  outputDir: 'test-results',
});
