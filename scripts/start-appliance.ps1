<#
  Supervised launcher for the VirtualScreen appliance.

  Runs the backend (which also serves the built frontend via
  VIRTUALSCREEN_STATIC_DIR) as a single uvicorn process, under a watchdog
  loop that restarts it if it exits, crashes, or stops responding. This is
  the script that autostart (the Scheduled Task registered by
  setup-appliance.ps1) invokes at logon.

  The watchdog is designed to survive on a machine with no keyboard/monitor:
  logging is best-effort and never allowed to kill the loop, uvicorn's own
  stdout/stderr are captured into appliance.log, appliance.log is rotated
  before it can fill the disk, and a hung-but-alive uvicorn is detected via
  periodic /api/health probes and killed so it gets restarted.

  Run frontend/npm run build before using this script -- it does not build
  the frontend itself.
#>

param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8000,
  [string]$BindHost = "0.0.0.0",
  [ValidateRange(1, 3600)]
  [int]$HealthProbeIntervalSeconds = 30,
  [ValidateRange(1, 100)]
  [int]$HealthProbeFailureLimit = 3,
  [ValidateRange(1, 3600)]
  [int]$StartupGraceSeconds = 60
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$backendDir = Join-Path $root "backend"
$distDir = Join-Path $root "frontend\dist"
$stateDir = Join-Path $root ".virtualscreen"
$logFile = Join-Path $stateDir "appliance.log"
$outTmp = Join-Path $stateDir "uvicorn.out.tmp"
$errTmp = Join-Path $stateDir "uvicorn.err.tmp"

if (-not (Test-Path $stateDir)) {
  New-Item -ItemType Directory -Path $stateDir | Out-Null
}

function Write-ApplianceLog {
  param([string]$Message)
  $line = "[$((Get-Date).ToString('o'))] $Message"
  Write-Host $line
  Add-Content -Path $logFile -Encoding utf8 -Value $line -ErrorAction SilentlyContinue
}

function Limit-ApplianceLog {
  # Best-effort log rotation so a runaway log can never fill the disk and
  # take the watchdog's own logging down with it.
  try {
    if (Test-Path $logFile) {
      $item = Get-Item -LiteralPath $logFile -ErrorAction SilentlyContinue
      if ($item -and $item.Length -gt 5MB) {
        $rotated = "$logFile.1"
        Move-Item -LiteralPath $logFile -Destination $rotated -Force -ErrorAction SilentlyContinue
      }
    }
  }
  catch {
    # Rotation is best-effort; never let it block startup.
  }
}

function Get-EnvFileValue {
  param([string]$Name)

  $envFile = Join-Path $root ".env"
  if (-not (Test-Path $envFile)) {
    return $null
  }

  $escapedName = [regex]::Escape($Name)
  try {
    foreach ($line in Get-Content -LiteralPath $envFile) {
      if ($line -match '^\s*#') {
        continue
      }
      if ($line -match "^\s*$escapedName\s*=\s*(.*?)\s*$") {
        return $matches[1].Trim().Trim('"').Trim("'")
      }
    }
  }
  catch {
    return $null
  }

  return $null
}

function Merge-ApplianceOutput {
  # Start-Process overwrites $outTmp/$errTmp on every run, so fold whatever
  # they hold into the durable log and clear them out. This is what
  # preserves a crash's explanation (e.g. a ModuleNotFoundError on stderr)
  # while still letting someone tail the .tmp files live during a run.
  foreach ($stream in @(
      @{ Path = $outTmp; Label = "stdout" },
      @{ Path = $errTmp; Label = "stderr" }
    )) {
    if (Test-Path $stream.Path) {
      $content = Get-Content -LiteralPath $stream.Path -Raw -ErrorAction SilentlyContinue
      if (-not [string]::IsNullOrWhiteSpace($content)) {
        Add-Content -Path $logFile -Encoding utf8 -Value "----- uvicorn $($stream.Label) -----" -ErrorAction SilentlyContinue
        Add-Content -Path $logFile -Encoding utf8 -Value $content -ErrorAction SilentlyContinue
      }
      Remove-Item -LiteralPath $stream.Path -ErrorAction SilentlyContinue
    }
  }
}

$python = $venvPython
if (-not (Test-Path $python)) {
  Write-ApplianceLog "FATAL: missing virtual environment at $venvPython. Refusing to fall back to 'python' on PATH -- create the venv and install dependencies before running the appliance."
  exit 1
}

if (-not (Test-Path (Join-Path $distDir "index.html"))) {
  Write-ApplianceLog "FATAL: missing $distDir\index.html. Run 'npm run build' in frontend/ first."
  exit 1
}

$env:PYTHONPATH = $backendDir
$env:VIRTUALSCREEN_STATIC_DIR = $distDir
$env:VIRTUALSCREEN_WATCH_WORLD = "true"
$env:VIRTUALSCREEN_HOST = $BindHost
$env:VIRTUALSCREEN_PORT = $Port

$accessToken = Get-EnvFileValue "VIRTUALSCREEN_ACCESS_TOKEN"
$isLoopbackHost = ($BindHost -eq "127.0.0.1") -or ($BindHost -eq "localhost") -or ($BindHost -eq "::1")
if ([string]::IsNullOrWhiteSpace($accessToken) -and -not $isLoopbackHost) {
  Write-ApplianceLog "FATAL: VIRTUALSCREEN_ACCESS_TOKEN is not set in .env and BindHost ($BindHost) is not loopback. Refusing to publish an unauthenticated appliance to the network -- set VIRTUALSCREEN_ACCESS_TOKEN in .env and try again."
  exit 1
}
if (-not [string]::IsNullOrWhiteSpace($accessToken)) {
  $env:VIRTUALSCREEN_ACCESS_TOKEN = $accessToken
}

$worldsRoot = Get-EnvFileValue "VIRTUALSCREEN_WORLDS_ROOT"
if (-not [string]::IsNullOrWhiteSpace($worldsRoot)) {
  $env:VIRTUALSCREEN_WORLDS_ROOT = $worldsRoot
}

Write-Host "VirtualScreen appliance starting at http://${BindHost}:${Port}"
Write-Host "Log file: $logFile"

$backoffSeconds = 5
$maxBackoffSeconds = 60

# The health probe always has to dial a loopback-reachable address, even
# when -BindHost is a wildcard/any-address value the OS accepts for binding
# but nothing can ever dial back out to (0.0.0.0, ::) -- otherwise every
# probe fails and a perfectly healthy server gets killed ~$StartupGraceSeconds
# into every run. 0.0.0.0 and :: are NOT interchangeable here: Python sets
# IPV6_V6ONLY=1 on Windows by default, so a listener bound to :: accepts no
# IPv4 traffic at all, and probing it via 127.0.0.1 would fail forever --
# :: has to be probed via its own loopback equivalent, ::1.
$probeHost = $BindHost
if ([string]::IsNullOrWhiteSpace($probeHost) -or $probeHost -eq "0.0.0.0") {
  $probeHost = "127.0.0.1"
}
elseif ($probeHost -eq "::") {
  $probeHost = "[::1]"
}
elseif (($probeHost.Contains(":")) -and (-not $probeHost.StartsWith("["))) {
  # IPv6 literal -- needs bracketing to be a valid URL host.
  $probeHost = "[$probeHost]"
}
$healthUri = "http://${probeHost}:$Port/api/health"

# Fold any diagnostics left behind by a previous run that ended abruptly
# (e.g. the script itself was killed) into appliance.log before the first
# Start-Process below truncates $outTmp/$errTmp and that explanation is
# lost unread.
Merge-ApplianceOutput

while ($true) {
  try {
    Limit-ApplianceLog

    $startedAt = Get-Date
    Write-ApplianceLog "Starting uvicorn on ${BindHost}:${Port}"

    # A single pre-quoted argument string, not an array: PS 5.1's
    # Start-Process joins -ArgumentList array elements with an unquoted
    # space, so any path containing a space (e.g. under
    # C:\Users\First Last\...) breaks apart into extra positional
    # arguments and uvicorn dies confusingly. --no-access-log stops
    # uvicorn from writing a line per HTTP request to stdout, into a file
    # handle it holds open for the whole run -- unbounded on a healthy
    # appliance, since Windows will not let us rotate a file out from
    # under the process that has it open. stderr (startup banners,
    # tracebacks) is unaffected and still captured.
    $uvicornArgs = "-m uvicorn app.main:app --app-dir `"$backendDir`" --host `"$BindHost`" --port `"$Port`" --no-access-log"

    $proc = Start-Process -FilePath $python -ArgumentList $uvicornArgs -PassThru -NoNewWindow -RedirectStandardOutput $outTmp -RedirectStandardError $errTmp

    # Supervise the running process: react to it exiting, and also to it
    # hanging while still alive (a known SQLite-concurrency deadlock risk
    # in this app would otherwise serve nothing forever).
    #
    # This inner supervision is wrapped in its own try/finally (rather than
    # relying on individually-guarded try/catch around every
    # Write-ApplianceLog call below) so that however control leaves it --
    # normal break, the loop condition going false, or an exception from a
    # logging call that isn't fully guarded -- the finally block always
    # reaps the child and merges its output. Without this, an exception
    # escaping mid-loop would unwind straight past the bounded WaitForExit
    # and Merge-ApplianceOutput below, orphaning a live uvicorn that the
    # next iteration can't rebind its port around.
    try {
      $failedProbes = 0
      while (-not $proc.HasExited) {
        Start-Sleep -Seconds $HealthProbeIntervalSeconds
        if ($proc.HasExited) {
          break
        }

        # Belt-and-braces hard bound on the child's redirected output files.
        # --no-access-log above should keep these near-empty for the life of
        # a healthy run, but Windows will not let us rotate a file out from
        # under a process that still holds it open, so if anything still
        # grows these unbounded (a noisy crash-retry loop on stderr, etc.)
        # the only way to reclaim the space is to restart -- which is what
        # Merge-ApplianceOutput's truncate-on-relaunch behaviour gives us.
        # Best-effort: this check must never itself take the loop down.
        try {
          $outItem = Get-Item -LiteralPath $outTmp -ErrorAction SilentlyContinue
          $errItem = Get-Item -LiteralPath $errTmp -ErrorAction SilentlyContinue
          $outputOversized = ($outItem -and $outItem.Length -gt 50MB) -or ($errItem -and $errItem.Length -gt 50MB)
          if ($outputOversized) {
            Write-ApplianceLog "uvicorn output capture exceeded 50MB; killing it so the watchdog can restart and truncate it."
            try {
              $proc.Kill()
            }
            catch {
              Write-ApplianceLog "Failed to kill oversized-output uvicorn process: $($_.Exception.Message)"
            }
            break
          }
        }
        catch {
          # Best-effort size check; never let it block the supervise loop.
        }

        if (((Get-Date) - $startedAt).TotalSeconds -lt $StartupGraceSeconds) {
          continue
        }

        try {
          Invoke-WebRequest -Uri $healthUri -TimeoutSec 10 -UseBasicParsing | Out-Null
          $failedProbes = 0
        }
        catch {
          $failedProbes += 1
          Write-ApplianceLog "Health probe failed ($failedProbes/$HealthProbeFailureLimit): $($_.Exception.Message)"
          if ($failedProbes -ge $HealthProbeFailureLimit) {
            Write-ApplianceLog "uvicorn looks hung (unresponsive on $healthUri after $HealthProbeFailureLimit probes); killing it so the watchdog can restart it."
            try {
              $proc.Kill()
            }
            catch {
              Write-ApplianceLog "Failed to kill hung uvicorn process: $($_.Exception.Message)"
            }
            break
          }
        }
      }
    }
    finally {
      # Bounded wait: if the health probe above already tried to kill a hung
      # process, Kill() is asynchronous and the process can still be lingering
      # (plausible in uninterruptible I/O against a network/Syncthing-backed
      # worlds folder), or Kill() itself may have thrown. An unbounded
      # WaitForExit() here would block the watchdog forever -- a hang is not
      # an exception the outer try/catch can catch, Task Scheduler's
      # ExecutionTimeLimit is disabled by design, and RestartCount only fires
      # on task failure, not on a hang. So: wait with a timeout, try one more
      # guarded kill if it is still not gone, then proceed regardless.
      if (-not $proc.WaitForExit(30000)) {
        Write-ApplianceLog "uvicorn did not exit within 30s; attempting to kill it again before giving up on waiting."
        try {
          $proc.Kill()
        }
        catch {
          Write-ApplianceLog "Failed to kill still-running uvicorn process: $($_.Exception.Message)"
        }
        $proc.WaitForExit(15000) | Out-Null
      }

      try {
        $exitCode = $proc.ExitCode
      }
      catch {
        # ExitCode throws if the process still has not exited; do not let
        # that escape and kill the watchdog loop.
        $exitCode = "unknown"
      }

      $finishedAt = Get-Date
      $ranFor = ($finishedAt - $startedAt).TotalSeconds

      Merge-ApplianceOutput
      Write-ApplianceLog "uvicorn exited with code $exitCode after $([math]::Round($ranFor, 1))s"
    }

    if ($ranFor -gt 60) {
      # It ran for a while before dying; treat this as a fresh start and
      # reset the backoff instead of letting it climb toward the cap.
      $backoffSeconds = 5
    }

    Write-ApplianceLog "Restarting in $backoffSeconds seconds."
  }
  catch {
    # Nothing that happens in here -- including a logging failure -- may
    # ever escape and end the watchdog loop. Log what we can and retry.
    try {
      Write-ApplianceLog "Unhandled error in watchdog loop: $($_.Exception.Message)"
    }
    catch {
      # Logging itself must never be able to end the loop.
    }
  }

  Start-Sleep -Seconds $backoffSeconds
  $backoffSeconds = [math]::Min($backoffSeconds * 2, $maxBackoffSeconds)
}
