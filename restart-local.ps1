$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDirectory = Join-Path $workspace 'artifacts\api-server'
$webDirectory = Join-Path $workspace 'artifacts\islamic-book-bundle'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCommand) {
  throw 'Node.js is not available. Install Node.js, restart Windows Terminal, then run this file again.'
}

$nodeExecutable = $nodeCommand.Source
$ports = @(5000, 5173)
$owners = [System.Collections.Generic.HashSet[int]]::new()

if (-not (Test-Path (Join-Path $workspace '.env'))) {
  throw 'The .env file is missing from the project folder. Restore it, then run this file again.'
}

# Get-NetTCPConnection can return no results in restricted Windows sessions.
# netstat provides a fallback that also lets us verify that the old listener stopped.
$netstat = & netstat.exe -ano -p tcp
if ($LASTEXITCODE -ne 0) {
  throw 'Could not inspect the local website processes. Run this file from Windows PowerShell.'
}

foreach ($line in $netstat) {
  if ($line -match '^\s*TCP\s+\S+:(5000|5173)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
    [void]$owners.Add([int]$Matches[2])
  }
}

foreach ($owner in $owners) {
  $process = Get-Process -Id $owner -ErrorAction SilentlyContinue
  if (-not $process) { continue }
  if ($process.ProcessName -notin @('node', 'nodejs')) {
    throw "Port 5000 or 5173 belongs to '$($process.ProcessName)' (PID $owner). Close that program, then run this file again."
  }

  Write-Host "Stopping the old website server (PID $owner)..."
  & taskkill.exe /PID $owner /F | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Windows could not stop the old server (PID $owner). Close its terminal window and run this file again."
  }
}

Start-Sleep -Seconds 1
$remaining = & netstat.exe -ano -p tcp
foreach ($line in $remaining) {
  if ($line -match '^\s*TCP\s+\S+:(5000|5173)\s+\S+\s+LISTENING\s+(\d+)\s*$') {
    throw "Port $($Matches[1]) is still busy (PID $($Matches[2])). Close the old website terminal and try again."
  }
}

Write-Host 'Building the API from the latest project files...'
Push-Location $workspace
try {
  & $nodeExecutable '.\artifacts\api-server\build.mjs'
  if ($LASTEXITCODE -ne 0) {
    throw 'The API build failed. Read the build error above, fix it, then run this file again.'
  }
}
finally {
  Pop-Location
}

Write-Host 'Starting the API and website. Keep both new windows open.'
$apiCommand = "& '$nodeExecutable' --env-file-if-exists=../../.env --enable-source-maps ./dist/index.mjs"
$webCommand = "& '$nodeExecutable' ./node_modules/vite/bin/vite.js --config vite.config.ts --host 0.0.0.0"
Start-Process -FilePath 'powershell.exe' -WindowStyle Normal -WorkingDirectory $apiDirectory -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $apiCommand)
Start-Process -FilePath 'powershell.exe' -WindowStyle Normal -WorkingDirectory $webDirectory -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $webCommand)

Start-Sleep -Seconds 3
Write-Host ''
Write-Host 'Website link for this computer:' -ForegroundColor Green
Write-Host '  http://localhost:5173/' -ForegroundColor Cyan
Write-Host '  From your phone on the same Wi-Fi, use the Network address shown in the website window.' -ForegroundColor Cyan
Start-Process 'http://localhost:5173/'
