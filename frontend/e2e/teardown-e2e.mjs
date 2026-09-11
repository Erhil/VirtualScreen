import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendDir, "..");
const stateDir = resolve(repoRoot, ".virtualscreen");
const pidFile = resolve(stateDir, "e2e-pids.json");

function killProcessTree(pid) {
  if (!pid) {
    return;
  }
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-Number(pid), "SIGTERM");
    }
  } catch {
    // The process may have already exited during normal Playwright shutdown.
  }
}

export default async function globalTeardown() {
  if (!existsSync(pidFile)) {
    return;
  }
  const pids = JSON.parse(readFileSync(pidFile, "utf-8"));
  killProcessTree(pids.frontendPid);
  killProcessTree(pids.backendPid);
  rmSync(pidFile, { force: true });
}
