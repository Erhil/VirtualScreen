param(
  [int[]]$Ports = @(5173, 5174, 8000, 8010),
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$listeners = foreach ($port in $Ports) {
  Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
      $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      [pscustomobject]@{
        Port = $_.LocalPort
        Address = $_.LocalAddress
        Pid = $_.OwningProcess
        Process = if ($process) { $process.ProcessName } else { "<unknown>" }
      }
    }
}

if ($Json) {
  @($listeners) | ConvertTo-Json
  return
}

if (-not $listeners) {
  Write-Host "No listeners found on ports: $($Ports -join ', ')"
  return
}

$listeners | Sort-Object Port, Pid | Format-Table -AutoSize
