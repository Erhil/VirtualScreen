$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ".virtualscreen\dev-pids.json"

function Get-DescendantProcessIds {
  param([int]$RootProcessId)

  $children = Get-CimInstance Win32_Process | Where-Object {
    $_.ParentProcessId -eq $RootProcessId
  }

  foreach ($child in $children) {
    Get-DescendantProcessIds -RootProcessId $child.ProcessId
    $child.ProcessId
  }
}

if (-not (Test-Path $pidFile)) {
  Write-Host "No dev PID file found at $pidFile"
  return
}

$state = Get-Content -Path $pidFile -Raw | ConvertFrom-Json
$pids = @($state.backendPowerShellPid, $state.frontendPowerShellPid) | Where-Object { $_ }

foreach ($processId in $pids) {
  $processTree = @(Get-DescendantProcessIds -RootProcessId $processId) + @($processId)
  foreach ($treeProcessId in $processTree) {
    $process = Get-Process -Id $treeProcessId -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $treeProcessId -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped process $treeProcessId"
    }
  }
}

Remove-Item -LiteralPath $pidFile -Force
Write-Host "Removed $pidFile"
