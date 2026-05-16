$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$backendDir = Join-Path $root "backend"
$stateDir = Join-Path $root ".virtualscreen"
$pidFile = Join-Path $stateDir "dev-pids.json"

function Get-FreePort {
  param([int]$PreferredPort)

  $port = $PreferredPort
  while (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    $port += 1
  }

  return $port
}

if (-not (Test-Path $venvPython)) {
  Write-Error "Missing Python virtual environment. Run: python -m venv .venv"
}

if (-not (Test-Path $stateDir)) {
  New-Item -ItemType Directory -Path $stateDir | Out-Null
}

$backendPort = Get-FreePort -PreferredPort 8000
$frontendHost = "0.0.0.0"
$frontendPort = Get-FreePort -PreferredPort 5173
$accessToken = $env:VIRTUALSCREEN_ACCESS_TOKEN
$generatedAccessToken = $false
if ([string]::IsNullOrWhiteSpace($accessToken)) {
  $bytes = [byte[]]::new(6)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  }
  finally {
    $rng.Dispose()
  }
  $accessToken = ([System.BitConverter]::ToString($bytes) -replace "-", "")
  $generatedAccessToken = $true
}

$lanAddress = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
  } |
  Select-Object -First 1 -ExpandProperty IPAddress

$previousAccessToken = $env:VIRTUALSCREEN_ACCESS_TOKEN
$env:VIRTUALSCREEN_ACCESS_TOKEN = $accessToken
try {
  $backend = Start-Process powershell -WindowStyle Hidden -PassThru -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root'; `$env:PYTHONPATH='$backendDir'; `$env:VIRTUALSCREEN_WATCH_WORLD='true'; & '$venvPython' -m uvicorn app.main:app --app-dir '$backendDir' --host 127.0.0.1 --port $backendPort --reload --reload-dir '$backendDir'"
  )
}
finally {
  if ($null -eq $previousAccessToken) {
    Remove-Item Env:\VIRTUALSCREEN_ACCESS_TOKEN -ErrorAction SilentlyContinue
  }
  else {
    $env:VIRTUALSCREEN_ACCESS_TOKEN = $previousAccessToken
  }
}

$frontend = Start-Process powershell -WindowStyle Hidden -PassThru -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$root\frontend'; `$env:VIRTUALSCREEN_API_TARGET='http://127.0.0.1:$backendPort'; npm run dev -- --host $frontendHost --port $frontendPort"
)

@{
  backendPowerShellPid = $backend.Id
  frontendPowerShellPid = $frontend.Id
  backendPort = $backendPort
  frontendHost = $frontendHost
  frontendPort = $frontendPort
  accessTokenGenerated = $generatedAccessToken
  startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -Path $pidFile -Encoding UTF8

Write-Host "Backend starting at http://localhost:$backendPort"
Write-Host "Frontend starting at http://localhost:$frontendPort"
if ($lanAddress) {
  Write-Host "LAN frontend starting at http://$($lanAddress):$frontendPort"
} else {
  Write-Host "LAN frontend starting at http://<this-pc-lan-ip>:$frontendPort"
}
Write-Host "VirtualScreen unlock code: $accessToken"
Write-Host "PID file written to $pidFile"
