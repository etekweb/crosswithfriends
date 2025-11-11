import {defineConfig, devices} from '@playwright/experimental-ct-react';
import path from 'path';

/**
 * Playwright Component Testing configuration
 * See https://playwright.dev/docs/test-components
 */
export default defineConfig({
  testDir: './src/tests/components',
  /* The base directory, relative to the config file, for snapshot files created with toHaveScreenshot and toMatchSnapshot. */
  snapshotDir: './src/tests/__snapshots__',
  /* Maximum time one test can run for. */
  timeout: 10 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Port to use for the component server. */
    ctPort: 3100,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Vite config for component testing */
    ctViteConfig: {
      resolve: {
        alias: [
          {
            find: '@crosswithfriends/shared/lib',
            replacement: path.resolve(__dirname, '../shared/src/lib'),
          },
          {
            find: '@crosswithfriends/shared/fencingGameEvents',
            replacement: path.resolve(__dirname, '../shared/src/shared/fencingGameEvents'),
          },
          {
            find: '@crosswithfriends/shared/roomEvents',
            replacement: path.resolve(__dirname, '../shared/src/shared/roomEvents'),
          },
          {
            find: '@crosswithfriends/shared/types',
            replacement: path.resolve(__dirname, '../shared/src/shared/types'),
          },
          {
            find: '@crosswithfriends/shared',
            replacement: path.resolve(__dirname, '../shared/src/shared'),
          },
          {
            find: '@shared',
            replacement: path.resolve(__dirname, '../shared/src/shared'),
          },
          {
            find: '@lib',
            replacement: path.resolve(__dirname, '../shared/src/lib'),
          },
        ],
      },
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'firefox',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'webkit',
      use: {...devices['Desktop Safari']},
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3020',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
