param(
  [int]$MaxSampleAssetMegabytes = 5
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$strictReleaseExport = (Split-Path -Leaf $root) -eq "release"

function Add-Issue {
  param([string]$Message)
  $issues.Add($Message) | Out-Null
}

function Add-Warning {
  param([string]$Message)
  $warnings.Add($Message) | Out-Null
}

function Test-InsideRoot {
  param(
    [string]$Path,
    [string]$RootPath
  )
  $resolvedPath = [System.IO.Path]::GetFullPath($Path)
  $resolvedRoot = [System.IO.Path]::GetFullPath($RootPath)
  return $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-GitTracked {
  param([string]$RelativePath)
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) {
    return $false
  }
  Push-Location $root
  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) {
      return $false
    }
    & git ls-files --error-unmatch -- "$RelativePath" *> $null
    return $LASTEXITCODE -eq 0
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
    Pop-Location
  }
}

function Test-GitRepo {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) {
    return $false
  }
  Push-Location $root
  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git rev-parse --is-inside-work-tree *> $null
    return $LASTEXITCODE -eq 0
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
    Pop-Location
  }
}

$sampleWorld = Join-Path $root "sample-world"
$sampleState = Join-Path $sampleWorld ".virtualscreen"
$allowedSampleState = Join-Path $sampleState "card-templates"
$generatedCandidates = @(
  ".venv",
  "frontend/node_modules",
  "frontend/dist",
  "frontend/playwright-report",
  "frontend/test-results",
  ".pytest_cache",
  ".ruff_cache",
  ".mypy_cache",
  ".virtualscreen/dev-pids.json",
  "dev-world"
)

$terminologyScanPaths = @(
  "README.md",
  ".env.example",
  "backend",
  "frontend/src",
  "frontend/e2e",
  "docs",
  "scripts",
  "sample-world",
  ".github"
)
$oldTermPattern = '\b[Vv]' + 'ault\b|\bV' + 'AULT\b'

function Test-GeneratedArtifact {
  param([string]$FullName)

  $fullPath = [System.IO.Path]::GetFullPath($FullName)
  foreach ($relativePath in $generatedCandidates) {
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath)).TrimEnd("\", "/")
    if ($fullPath -eq $candidate -or $fullPath.StartsWith("$candidate\", [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }
  return $false
}

$requiredReleaseFiles = @(
  "README.md",
  "LICENSE",
  ".github/workflows/ci.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/pull_request_template.md",
  "backend/pyproject.toml",
  "frontend/package.json",
  "frontend/package-lock.json",
  "scripts/test.ps1",
  "scripts/dev.ps1",
  "scripts/stop-dev.ps1",
  "scripts/check-dev.ps1"
)

foreach ($relativePath in $requiredReleaseFiles) {
  if (-not (Test-Path (Join-Path $root $relativePath))) {
    Add-Issue "required release file is missing: $relativePath"
  }
}

foreach ($relativePath in $terminologyScanPaths) {
  $scanRoot = Join-Path $root $relativePath
  if (-not (Test-Path $scanRoot)) {
    continue
  }
  $files = @()
  if (Test-Path -PathType Leaf $scanRoot) {
    $files = @(Get-Item -LiteralPath $scanRoot)
  }
  else {
    $files = @(
      Get-ChildItem -LiteralPath $scanRoot -Recurse -Force -File -ErrorAction SilentlyContinue |
        Where-Object {
          $_.FullName -notlike "*\node_modules\*" -and
          $_.FullName -notlike "*\.venv\*" -and
          $_.FullName -notlike "*\.pytest_cache\*" -and
          $_.FullName -notlike "*\.ruff_cache\*" -and
          $_.FullName -notlike "*\.mypy_cache\*" -and
          $_.FullName -notlike "*\dist\*" -and
          $_.FullName -notlike "*\test-results\*" -and
          $_.FullName -notlike "*\playwright-report\*" -and
          $_.FullName -notlike "*\__pycache__\*" -and
          $_.Extension -notin @(".pyc", ".pyo", ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".wav", ".pdf", ".bin", ".zip")
        }
    )
  }
  foreach ($file in $files) {
    $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -ne $text -and $text -match $oldTermPattern) {
      $relative = $file.FullName.Substring($root.Length + 1)
      Add-Issue "old pre-world terminology remains in release source: $relative"
    }
  }
}

if ($strictReleaseExport) {
  $forbiddenAgentFiles = @(
    "AGENTS.md",
    ".agents",
    ".codex",
    ".codex-plugin",
    "SKILL.md"
  )

  foreach ($relativePath in $forbiddenAgentFiles) {
    if (Test-Path (Join-Path $root $relativePath)) {
      Add-Issue "agent-only file or folder must not ship in release export: $relativePath"
    }
  }

  $sourcePyCaches = @(
    Get-ChildItem -LiteralPath $root -Recurse -Force -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq "__pycache__" -and -not (Test-GeneratedArtifact $_.FullName) }
  )
  if ($sourcePyCaches.Count -gt 0) {
    Add-Warning "$($sourcePyCaches.Count) Python cache directories exist locally in release export; remove them before publishing."
  }

  $sourceBytecode = @(
    Get-ChildItem -LiteralPath $root -Recurse -Force -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -in @(".pyc", ".pyo") -and -not (Test-GeneratedArtifact $_.FullName) }
  )
  if ($sourceBytecode.Count -gt 0) {
    $trackedBytecode = @(
      $sourceBytecode | Where-Object {
        $relative = $_.FullName.Substring($root.Length + 1)
        Test-GitTracked $relative
      }
    )
    if ($trackedBytecode.Count -gt 0) {
      $trackedBytecode | ForEach-Object {
        Add-Issue "tracked Python bytecode must not ship in release export: $($_.FullName)"
      }
    }
    else {
      Add-Warning "$($sourceBytecode.Count) Python bytecode files exist locally in release export; remove them before publishing."
    }
  }
}

if (Test-Path $sampleWorld) {
  if (Test-Path $sampleState) {
    Get-ChildItem -LiteralPath $sampleState -Force | ForEach-Object {
      if ($_.FullName -ne $allowedSampleState) {
        Add-Issue "sample-world contains release-blocking runtime state: $($_.FullName)"
      }
    }
    if (Test-Path $allowedSampleState) {
      Get-ChildItem -LiteralPath $allowedSampleState -Recurse -Force | Where-Object {
        $_.PSIsContainer -or $_.Extension.ToLowerInvariant() -ne ".json"
      } | ForEach-Object {
        Add-Issue "sample card templates must contain direct JSON template files only: $($_.FullName)"
      }
    }
  }

  $maxBytes = $MaxSampleAssetMegabytes * 1MB
  Get-ChildItem -LiteralPath $sampleWorld -Recurse -Force -File | Where-Object {
    $_.FullName -notlike "$allowedSampleState*"
  } | ForEach-Object {
    $relative = $_.FullName.Substring($sampleWorld.Length + 1)
    if ($_.Length -gt $maxBytes) {
      Add-Issue "sample-world asset exceeds ${MaxSampleAssetMegabytes}MB: $relative"
    }
    if ($relative -match '(^|[\\/])output-\d+\.md$') {
      Add-Issue "sample-world contains generated DMS output: $relative"
    }
    if ($_.Name -like "New Card*.cs") {
      Add-Issue "sample-world contains scratch card: $relative"
    }
    if ($relative -match '^Session Logs[\\/]') {
      Add-Issue "sample-world contains generated session log: $relative"
    }
    if ($relative -match '^data[\\/](new-|New Note)') {
      Add-Issue "sample-world contains ad-hoc generated data file: $relative"
    }
  }
}

foreach ($relativePath in $generatedCandidates) {
  $fullPath = Join-Path $root $relativePath
  if (Test-Path $fullPath) {
    if (Test-GitTracked $relativePath) {
      Add-Issue "generated artifact is tracked and must not ship: $relativePath"
    }
    elseif (-not (Test-GitRepo)) {
      Add-Warning "generated artifact exists locally but is not confirmed tracked: $relativePath"
    }
  }
}

if ($warnings.Count -gt 0) {
  Write-Host "Release hygiene warnings"
  Write-Host "------------------------"
  foreach ($warning in $warnings) {
    Write-Host "WARN $warning"
  }
  Write-Host ""
}

if ($issues.Count -gt 0) {
  Write-Host "Release hygiene failed"
  Write-Host "----------------------"
  foreach ($issue in $issues) {
    Write-Host "FAIL $issue"
  }
  exit 1
}

Write-Host "Release hygiene passed"
$global:LASTEXITCODE = 0
