import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendDir, "..");
const backendDir = resolve(repoRoot, "backend");
const stateDir = resolve(repoRoot, ".virtualscreen");
const e2eWorldsDir = resolve(stateDir, "e2e-worlds");
const e2eWorldRoot = resolve(e2eWorldsDir, "E2E World");
const logDir = resolve(stateDir, "e2e-logs");
const pidFile = resolve(stateDir, "e2e-pids.json");
const pythonExecutable = existsSync(resolve(repoRoot, ".venv", "Scripts", "python.exe"))
  ? resolve(repoRoot, ".venv", "Scripts", "python.exe")
  : "python";
const backendPort = process.env.VIRTUALSCREEN_E2E_BACKEND_PORT ?? "8100";
const frontendPort = process.env.VIRTUALSCREEN_E2E_FRONTEND_PORT ?? "5273";
const frontendHost = "127.0.0.1";
// Vite is started directly instead of through `npm run dev`. On Windows that went
// cmd.exe -> npm.cmd -> node -> vite, and somewhere in those hops the inherited stdout
// handle was lost: frontend.log was 0 bytes on every run, so whatever the dev server said
// about a failing page load was invisible. One hop, like the backend, and it is logged.
const frontendCommand = {
  command: process.execPath,
  args: [
    resolve(frontendDir, "node_modules", "vite", "bin", "vite.js"),
    "--host",
    frontendHost,
    "--port",
    frontendPort
  ]
};

mkdirSync(stateDir, { recursive: true });
mkdirSync(e2eWorldRoot, { recursive: true });
mkdirSync(logDir, { recursive: true });
// The backend now remembers which world was open, in a state file beside the
// library. Left behind, it would carry the last run's world into the next one
// before any spec has reset it.
rmSync(resolve(stateDir, "virtualscreen-state.json"), { force: true });

const children = [];
let failed = false;

function startChild(name, command, args, options) {
  // These used to be "ignore", which discarded the backend traceback behind every
  // 500 an e2e test hit. Keep both streams on disk so a failure can be explained.
  const logFd = openSync(resolve(logDir, `${name}.log`), "w");
  const child = spawn(command, args, {
    ...options,
    env: options.env,
    stdio: ["ignore", logFd, logFd],
    detached: true,
    windowsHide: true
  });
  children.push({ child, name });
  child.on("exit", (code, signal) => {
    if (!failed) {
      failed = true;
      console.error(`${name} exited before e2e servers were ready: ${signal ?? code}.`);
      process.exit(code || 1);
    }
  });
  return child;
}

async function waitForUrl(url, label) {
  const deadline = Date.now() + 120_000;
  let lastError = "";
  while (Date.now() < deadline) {
    for (const { child, name } of children) {
      if (child.exitCode !== null) {
        throw new Error(`${name} exited before ${label} became available.`);
      }
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Timed out waiting for ${label} at ${url}: ${lastError}`);
}

const backend = startChild(
  "backend",
  pythonExecutable,
  [
    "-m",
    "uvicorn",
    "app.main:app",
    "--app-dir",
    backendDir,
    "--host",
    frontendHost,
    "--port",
    backendPort
  ],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      VIRTUALSCREEN_ACCESS_TOKEN: "",
      VIRTUALSCREEN_WORLD_ROOT: e2eWorldRoot,
      VIRTUALSCREEN_WORLDS_ROOT: e2eWorldsDir,
      VIRTUALSCREEN_WATCH_WORLD: "true"
    }
  }
);

const frontend = startChild(
  "frontend",
  frontendCommand.command,
  frontendCommand.args,
  {
    cwd: frontendDir,
    env: {
      ...process.env,
      VIRTUALSCREEN_API_TARGET: `http://${frontendHost}:${backendPort}`
    }
  }
);

writeFileSync(
  pidFile,
  `${JSON.stringify(
    {
      backendPid: backend.pid,
      backendPort,
      frontendPid: frontend.pid,
      frontendPort,
      startedAt: new Date().toISOString()
    },
    null,
    2
  )}\n`,
  "utf-8"
);

await waitForUrl(`http://${frontendHost}:${backendPort}/api/health`, "backend");
await waitForUrl(`http://${frontendHost}:${frontendPort}`, "frontend");

// Stay alive until Playwright stops this process. Playwright reads this process exiting as
// the servers failing to start, and exiting on a timer raced its readiness check: after a
// busy build it lost twice ("webServer exited early") with both servers up. Holding the
// child handles keeps this process running; teardown still stops the servers by pid file.
for (const { child } of children) {
  child.removeAllListeners("exit");
}
