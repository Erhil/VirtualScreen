import { defineConfig, devices } from "@playwright/test";

const backendPort = 8010;
const frontendPort = 5174;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  expect: {
    timeout: 5_000
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
      command: `..\\.venv\\Scripts\\python -m uvicorn app.main:app --app-dir ..\\backend --host 127.0.0.1 --port ${backendPort}`,
      env: {
        ...process.env,
        VIRTUALSCREEN_WORLD_ROOT: "../.virtualscreen/e2e-worlds/E2E World",
        VIRTUALSCREEN_WORLDS_ROOT: "../.virtualscreen/e2e-worlds",
        VIRTUALSCREEN_WATCH_WORLD: "true"
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${backendPort}/api/health`
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      env: {
        ...process.env,
        VIRTUALSCREEN_API_TARGET: `http://127.0.0.1:${backendPort}`
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${frontendPort}`
    }
  ]
});
