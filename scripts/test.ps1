param(
  [ValidateSet("smoke", "full", "none")]
  [string]$E2E = "smoke"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$normalizedRoot = [System.IO.Path]::GetFullPath($root)
$testTemp = Join-Path $root ".virtualscreen\tmp"
New-Item -ItemType Directory -Force -Path $testTemp | Out-Null
$env:TMP = $testTemp
$env:TEMP = $testTemp

$stageResults = @()

function Get-DescendantProcessIds {
  param([int]$RootProcessId)

  try {
    $children = Get-CimInstance Win32_Process | Where-Object {
      $_.ParentProcessId -eq $RootProcessId
    }
  }
  catch {
    Write-Warning "Could not inspect child processes for PID $RootProcessId. Continuing cleanup best-effort."
    return @()
  }

  foreach ($child in $children) {
    Get-DescendantProcessIds -RootProcessId $child.ProcessId
    $child.ProcessId
  }
}

function Stop-TestPortListeners {
  $testPorts = @(5174, 8010)
  foreach ($port in $testPorts) {
    try {
      $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    }
    catch {
      Write-Warning "Could not inspect listeners on port $port. Continuing without port cleanup."
      continue
    }
    $owners = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($processId in $owners) {
      try {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
      }
      catch {
        $processInfo = $null
        Write-Warning "Port $port is occupied by PID $processId, but its command line could not be inspected. Leaving it running."
      }
      if (-not $processInfo) {
        continue
      }
      $commandLine = if ($processInfo) { $processInfo.CommandLine } else { "" }
      $isExpectedTestServer =
        -not [string]::IsNullOrWhiteSpace($commandLine) -and
        $commandLine.IndexOf($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0

      if (-not $isExpectedTestServer) {
        throw "Port $port is occupied by PID $processId outside this repo. Stop it before running tests."
      }

      $processTree = @(Get-DescendantProcessIds -RootProcessId $processId) + @($processId)
      foreach ($treeProcessId in $processTree) {
        if (Get-Process -Id $treeProcessId -ErrorAction SilentlyContinue) {
          Stop-Process -Id $treeProcessId -Force -ErrorAction SilentlyContinue
          Write-Host "Stopped stale test process $treeProcessId on port $port"
        }
      }
    }
  }
}

function Show-Summary {
  Write-Host ""
  Write-Host "Verification summary"
  Write-Host "--------------------"
  foreach ($result in $stageResults) {
    $seconds = [math]::Round($result.Duration.TotalSeconds, 1)
    Write-Host ("{0,-34} {1,-7} {2,8}s" -f $result.Name, $result.Status, $seconds)
    if ($result.Error) {
      Write-Host "  $($result.Error)"
    }
  }
}

function Invoke-Stage {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Name"
  $startedAt = Get-Date
  try {
    & $Command
    $duration = (Get-Date) - $startedAt
    $script:stageResults += [pscustomobject]@{
      Name = $Name
      Status = "PASS"
      Duration = $duration
      Error = $null
    }
    Write-Host ("<== {0} passed in {1}s" -f $Name, [math]::Round($duration.TotalSeconds, 1))
  }
  catch {
    $duration = (Get-Date) - $startedAt
    $script:stageResults += [pscustomobject]@{
      Name = $Name
      Status = "FAIL"
      Duration = $duration
      Error = $_.Exception.Message
    }
    Write-Host ("<== {0} failed in {1}s" -f $Name, [math]::Round($duration.TotalSeconds, 1))
    Show-Summary
    exit 1
  }
}

function Invoke-Native {
  param(
    [scriptblock]$Command
  )

  $global:LASTEXITCODE = 0
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command exited with code $LASTEXITCODE"
  }
}

Invoke-Stage "Preflight e2e cleanup" {
  Stop-TestPortListeners
  & (Join-Path $PSScriptRoot "check-dev.ps1") -Ports @(5173, 5174, 8000, 8010)
}

Invoke-Stage "Release hygiene" {
  Invoke-Native { & (Join-Path $PSScriptRoot "release-hygiene.ps1") }
}

Invoke-Stage "Backend pytest" {
  Invoke-Native { .\.venv\Scripts\python -m pytest backend }
}

Invoke-Stage "Backend Ruff" {
  Invoke-Native { .\.venv\Scripts\python -m ruff check backend }
}

Push-Location frontend
try {
  Invoke-Stage "Frontend Vitest" {
    Invoke-Native { npm run test }
  }

  Invoke-Stage "Frontend build" {
    Invoke-Native { npm run build }
  }

  if ($E2E -ne "none") {
    $e2eScript = if ($E2E -eq "full") { "test:e2e" } else { "test:e2e:smoke" }
    Invoke-Stage "Playwright e2e ($E2E)" {
      try {
        Stop-TestPortListeners
        Invoke-Native { npm run $e2eScript }
      }
      finally {
        Stop-TestPortListeners
      }
    }
  }
  else {
    Write-Host ""
    Write-Host "Skipping Playwright e2e because -E2E none was selected."
  }
}
finally {
  Pop-Location
}

Invoke-Stage "Postflight e2e cleanup" {
  Stop-TestPortListeners
  & (Join-Path $PSScriptRoot "check-dev.ps1") -Ports @(5173, 5174, 8000, 8010)
}

Show-Summary
