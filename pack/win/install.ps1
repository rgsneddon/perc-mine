# perc-mine Windows installer — Node.js 18+ CPU miner for Perccent (PERC).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path (Join-Path $Root 'src\miner.js'))) {
  $Root = Split-Path -Parent $PSScriptRoot
}
$Bin = Join-Path $env:LOCALAPPDATA 'perc-mine'
New-Item -ItemType Directory -Force -Path $Bin | Out-Null
Copy-Item -Recurse -Force (Join-Path $Root 'src') (Join-Path $Bin 'src')
Copy-Item -Force (Join-Path $PSScriptRoot 'perc-mine.cmd') (Join-Path $Bin 'perc-mine.cmd')
Copy-Item -Force (Join-Path $PSScriptRoot 'perc-mine-gui.cmd') (Join-Path $Bin 'perc-mine-gui.cmd')
$cmd = Join-Path $Bin 'perc-mine.cmd'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$Bin*") {
  [Environment]::SetEnvironmentVariable('Path', "$userPath;$Bin", 'User')
  $env:Path = "$env:Path;$Bin"
}
Write-Host "Installed perc-mine 1.0.2 to $Bin"
Write-Host "Open a new terminal, then:"
Write-Host "  perc-mine-gui"
Write-Host "  perc-mine --pool mineperc.restoreprivacy.online:1466 --user YOUR_PERC_NAME.worker1 --threads 4"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Warning "Node.js 18+ is required. Install from https://nodejs.org/"
}
