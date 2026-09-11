<#
  Supervised launcher for the VirtualScreen appliance: runs the backend
  (a single uvicorn process, also serving the built frontend) under a
  restart loop. Invoked at logon by the Scheduled Task that
  setup-appliance.ps1 registers. Run frontend/npm run build first.
#>

param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8000,
  [string]$BindHost = "0.0.0.0"
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
if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir | Out-Null }

function Write-ApplianceLog([string]$Message) {
  $line = "[$((Get-Date).ToString('o'))] $Message"
  Write-Host $line
  Add-Content -Path $logFile -Encoding utf8 -Value $line -ErrorAction SilentlyContinue
}
function Fail([string]$Message) {
  Write-ApplianceLog "FATAL: $Message"
  exit 1
}

# Reads .env just enough to know whether an access token is set, for the
# guard below -- the backend re-reads .env itself via pydantic-settings.
function Get-EnvFileValue([string]$Name) {
  $envFile = Join-Path $root ".env"
  if (-not (Test-Path $envFile)) { return $null }
  $escaped = [regex]::Escape($Name)
  foreach ($line in Get-Content -LiteralPath $envFile -ErrorAction SilentlyContinue) {
    if ($line -match "^\s*$escaped\s*=\s*(.*?)\s*$") { return $matches[1].Trim().Trim('"').Trim("'") }
  }
  return $null
}

# Start-Process overwrites $outTmp/$errTmp on every run, so fold each into
# the durable log (preserving a crash's explanation) before it is lost.
function Merge-Stream([string]$Path, [string]$Label) {
  if (-not (Test-Path $Path)) { return }
  $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  if (-not [string]::IsNullOrWhiteSpace($content)) {
    Add-Content -Path $logFile -Encoding utf8 -Value "----- uvicorn $Label -----`n$content" -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $Path -ErrorAction SilentlyContinue
}
function Merge-ApplianceOutput { Merge-Stream $outTmp "stdout"; Merge-Stream $errTmp "stderr" }

if (-not (Test-Path $venvPython)) {
  Fail "missing virtual environment at $venvPython. Refusing to fall back to 'python' on PATH -- create the venv and install dependencies before running the appliance."
}
if (-not (Test-Path (Join-Path $distDir "index.html"))) {
  Fail "missing $distDir\index.html. Run 'npm run build' in frontend/ first."
}

$env:PYTHONPATH = $backendDir
$env:VIRTUALSCREEN_STATIC_DIR = $distDir
$env:VIRTUALSCREEN_WATCH_WORLD = "true"
$env:VIRTUALSCREEN_HOST = $BindHost
$env:VIRTUALSCREEN_PORT = $Port
$accessToken = Get-EnvFileValue "VIRTUALSCREEN_ACCESS_TOKEN"
$isLoopbackHost = ($BindHost -eq "127.0.0.1") -or ($BindHost -eq "localhost") -or ($BindHost -eq "::1")
if ([string]::IsNullOrWhiteSpace($accessToken) -and -not $isLoopbackHost) {
  Fail "VIRTUALSCREEN_ACCESS_TOKEN is not set in .env and BindHost ($BindHost) is not loopback. Refusing to publish an unauthenticated appliance to the network -- set VIRTUALSCREEN_ACCESS_TOKEN in .env and try again."
}

Write-Host "VirtualScreen appliance starting at http://${BindHost}:${Port}"
Write-Host "Log file: $logFile"
$backoffSeconds = 5
$maxBackoffSeconds = 60
Merge-ApplianceOutput

while ($true) {
  try {
    $startedAt = Get-Date
    Write-ApplianceLog "Starting uvicorn on ${BindHost}:${Port}"

    # Single pre-quoted argument string, not an array: PS 5.1's Start-Process
    # joins -ArgumentList array elements with an unquoted space, breaking a
    # path containing a space into extra positional arguments.
    $uvicornArgs = "-m uvicorn app.main:app --app-dir `"$backendDir`" --host `"$BindHost`" --port `"$Port`" --no-access-log"
    # -WorkingDirectory is load-bearing: the backend reads .env relative to its own
    # working directory, while the token guard above reads $root\.env. Launched from
    # anywhere else, the guard would pass and the server would start without a token.
    $proc = Start-Process -FilePath $venvPython -ArgumentList $uvicornArgs -WorkingDirectory $root -PassThru -NoNewWindow -RedirectStandardOutput $outTmp -RedirectStandardError $errTmp
    $proc.WaitForExit()

    $exitCode = $proc.ExitCode
    $ranFor = ((Get-Date) - $startedAt).TotalSeconds
    Merge-ApplianceOutput
    Write-ApplianceLog "uvicorn exited with code $exitCode after $([math]::Round($ranFor, 1))s"
    if ($ranFor -gt 60) { $backoffSeconds = 5 } # ran a while; treat as a fresh start
    Write-ApplianceLog "Restarting in $backoffSeconds seconds."
  }
  catch {
    try { Write-ApplianceLog "Unhandled error in watchdog loop: $($_.Exception.Message)" } catch {}
  }

  Start-Sleep -Seconds $backoffSeconds
  $backoffSeconds = [math]::Min($backoffSeconds * 2, $maxBackoffSeconds)
}
