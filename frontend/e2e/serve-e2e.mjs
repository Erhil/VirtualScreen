import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendDir, "..");
const backendDir = resolve(repoRoot, "backend");
const stateDir = resolve(repoRoot, ".virtualscreen");
const e2eWorldsDir = resolve(stateDir, "e2e-worlds");
const e2eWorldRoot = resolve(e2eWorldsDir, "E2E World");
const pidFile = resolve(stateDir, "e2e-pids.json");
const stopMarker = resolve(stateDir, "e2e-stop");
const pythonExecutable = existsSync(resolve(repoRoot, ".venv", "Scripts", "python.exe"))
  ? resolve(repoRoot, ".venv", "Scripts", "python.exe")
  : "python";
const backendPort = process.env.VIRTUALSCREEN_E2E_BACKEND_PORT ?? "8010";
const frontendPort = process.env.VIRTUALSCREEN_E2E_FRONTEND_PORT ?? "5174";
const frontendHost = "127.0.0.1";
const frontendCommand =
  process.platform === "win32"
    ? {
        command: "cmd.exe",
        args: [
          "/d",
          "/s",
          "/c",
          `npm.cmd run dev -- --host ${frontendHost} --port ${frontendPort}`
        ]
      }
    : {
        command: "npm",
        args: ["run", "dev", "--", "--host", frontendHost, "--port", frontendPort]
      };

mkdirSync(stateDir, { recursive: true });
mkdirSync(e2eWorldRoot, { recursive: true });
rmSync(stopMarker, { force: true });

const children = [];
let failed = false;

function startChild(name, command, args, options) {
  const child = spawn(command, args, {
    ...options,
    env: options.env,
    stdio: "ignore",
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

for (const { child } of children) {
  child.removeAllListeners("exit");
  child.unref();
}

setTimeout(() => process.exit(0), 2_000);
