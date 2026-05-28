import { defineConfig, devices } from "@playwright/test";

const frontendPort = 5174;
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  timeout: isCi ? 90_000 : 60_000,
  workers: 1,
  globalTeardown: "./e2e/teardown-e2e.mjs",
  expect: {
    timeout: isCi ? 10_000 : 5_000
  },
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "node ./e2e/serve-e2e.mjs",
      env: { ...process.env },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${frontendPort}`
    }
  ]
});
