<#
  One-time machine preparation for the VirtualScreen appliance.

  This script changes SYSTEM POWER SETTINGS (disables sleep/hibernate,
  sets lid-close-does-nothing) and registers a Scheduled Task that
  autostarts scripts\start-appliance.ps1 at logon of the appliance account.

  Run this ONCE, on the appliance machine only (the headless laptop that
  will sit on the cabinet) -- never on the developer's own workstation.
  It must be run from an elevated ("Run as Administrator") PowerShell.

  Use -DryRun to preview every command this script would run without
  executing anything. That is the documented way to see what it does
  before committing to it.
#>

param(
  [string]$TaskName = "VirtualScreen Appliance",
  [string]$User = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $root "scripts\start-appliance.ps1"

if ($DryRun) {
  Write-Host "==== DRY RUN: no changes will be made. Commands below are shown, not executed. ====" -ForegroundColor Yellow
}
else {
  $isElevated = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isElevated) {
    Write-Error "This script must be run from an elevated PowerShell (right-click PowerShell, choose 'Run as Administrator'), then re-run this script."
  }
}

# Resolve which account the task should run as. The elevated identity
# (WindowsIdentity::GetCurrent()) is whichever account satisfied UAC, which
# is not necessarily the account that will actually be logged into the
# console -- if they differ, the trigger/principal must still point at the
# console account, or the appliance will silently never start.
$elevatedIdentity = ([Security.Principal.WindowsIdentity]::GetCurrent()).Name

$resolvedUser = $User
if ([string]::IsNullOrWhiteSpace($resolvedUser)) {
  $consoleUser = $null
  try {
    $consoleUser = (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName
  }
  catch {
    $consoleUser = $null
  }

  if (-not [string]::IsNullOrWhiteSpace($consoleUser)) {
    $resolvedUser = $consoleUser
  }
  else {
    $resolvedUser = $elevatedIdentity
  }
}

if ($resolvedUser -ne $elevatedIdentity) {
  Write-Warning "Console session owner ('$resolvedUser') differs from the elevated PowerShell identity ('$elevatedIdentity'). The scheduled task will be registered to run as '$resolvedUser' -- make sure that is the account that actually logs on to this machine."
}

function Invoke-ManagedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Description,
    [Parameter(Mandatory = $true)][string]$Exe,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $commandLine = "$Exe $($Arguments -join ' ')"
  Write-Host ""
  Write-Host $Description
  Write-Host "  Command: $commandLine"

  if ($DryRun) {
    Write-Host "  [DryRun] Not executed."
    return
  }

  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "  Exited with code $LASTEXITCODE"
  }
  else {
    Write-Host "  Done."
  }
}

Write-Host "=== Power settings ==="

Invoke-ManagedCommand -Description "Disable standby timeout on AC power" -Exe "powercfg" -Arguments @("/change", "standby-timeout-ac", "0")
Invoke-ManagedCommand -Description "Disable monitor timeout on AC power" -Exe "powercfg" -Arguments @("/change", "monitor-timeout-ac", "0")
Invoke-ManagedCommand -Description "Disable hibernate timeout on AC power" -Exe "powercfg" -Arguments @("/change", "hibernate-timeout-ac", "0")
Invoke-ManagedCommand -Description "Disable standby timeout on battery" -Exe "powercfg" -Arguments @("/change", "standby-timeout-dc", "0")
Invoke-ManagedCommand -Description "Disable hibernate timeout on battery" -Exe "powercfg" -Arguments @("/change", "hibernate-timeout-dc", "0")
Invoke-ManagedCommand -Description "Disable hibernate entirely" -Exe "powercfg" -Arguments @("/hibernate", "off")
Invoke-ManagedCommand -Description "Set lid-close action to 'do nothing' on AC power" -Exe "powercfg" -Arguments @("/setacvalueindex", "SCHEME_CURRENT", "SUB_BUTTONS", "LIDACTION", "0")
Invoke-ManagedCommand -Description "Set lid-close action to 'do nothing' on battery" -Exe "powercfg" -Arguments @("/setdcvalueindex", "SCHEME_CURRENT", "SUB_BUTTONS", "LIDACTION", "0")
Invoke-ManagedCommand -Description "Set critical battery action to shutdown on AC power" -Exe "powercfg" -Arguments @("/setacvalueindex", "SCHEME_CURRENT", "SUB_BATTERY", "BATACTIONCRITICAL", "3")
Invoke-ManagedCommand -Description "Set critical battery action to shutdown on battery" -Exe "powercfg" -Arguments @("/setdcvalueindex", "SCHEME_CURRENT", "SUB_BATTERY", "BATACTIONCRITICAL", "3")
Invoke-ManagedCommand -Description "Apply the active power scheme" -Exe "powercfg" -Arguments @("/setactive", "SCHEME_CURRENT")

Write-Host ""
Write-Host "=== Autostart (Scheduled Task) ==="

if (-not (Test-Path $startScript)) {
  Write-Error "Missing launcher script at $startScript. It must exist before the scheduled task can be registered (a task pointed at a missing file fails silently into a hidden window at logon, with no log). Check out the full repository before running setup-appliance.ps1."
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
  Write-Host ""
  Write-Host "Remove existing scheduled task '$TaskName' (so re-registering is safe)"
  Write-Host "  Command: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
  if ($DryRun) {
    Write-Host "  [DryRun] Not executed."
  }
  else {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Done."
  }
}

$actionArgument = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`""

Write-Host ""
Write-Host "Register scheduled task '$TaskName' to run at logon of '$resolvedUser'"
Write-Host "  Action:   powershell.exe $actionArgument"
Write-Host "  WorkDir:  $root"
Write-Host "  Trigger:  at logon of $resolvedUser"
Write-Host "  RunLevel: Limited"
Write-Host "  Settings: AllowStartIfOnBatteries, DontStopIfGoingOnBatteries, no execution time limit, restart up to 3 times (1 min apart) on failure"

if ($DryRun) {
  Write-Host "  [DryRun] Not executed."
}
else {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgument -WorkingDirectory $root
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $resolvedUser
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  $principal = New-ScheduledTaskPrincipal -UserId $resolvedUser -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
  Write-Host "  Done."
}

Write-Host ""
if ($DryRun) {
  Write-Host "==== DRY RUN complete. No changes were made. Re-run without -DryRun to apply. ====" -ForegroundColor Yellow
}
else {
  Write-Host "==== Machine preparation complete. ===="
}

Write-Host ""
Write-Host "=== MANUAL follow-up (deliberately NOT automated) ==="
Write-Host "1. Enable Windows auto-login for the account that runs the appliance."
Write-Host "   Prefer 'netplwiz' (uncheck 'Users must enter a password to use this computer')"
Write-Host "   or Sysinternals Autologon. Avoid the raw registry method (DefaultPassword) --"
Write-Host "   it stores the account password in plaintext in the registry."
Write-Host "2. Install Tailscale and sign in, so the appliance is reachable remotely."
Write-Host "3. Install Syncthing and share the worlds folder."
Write-Host "4. Reboot the machine once and confirm the app comes back up by itself"
Write-Host "   (no keyboard/monitor attached) before relying on it unattended."
Write-Host "   Use an update-style reboot (sign out, then run 'shutdown /r /t 0') rather"
Write-Host "   than Start menu > Restart -- Windows Update can otherwise land the machine"
Write-Host "   on a lock screen where the logon trigger never fires."
Write-Host "5. In BIOS/UEFI, enable 'Restore on AC Power Loss' (naming varies by vendor)."
Write-Host "   With hibernate disabled, a critical-battery event ends in a full shutdown --"
Write-Host "   without this setting the laptop will not power back on by itself once mains"
Write-Host "   power returns."
