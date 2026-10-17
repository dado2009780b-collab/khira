$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$ports = @(5000, 5173)
$owners = [System.Collections.Generic.HashSet[int]]::new()

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

Write-Host 'Starting the updated API and website. Keep both new windows open.'
Start-Process -FilePath 'powershell.exe' -WindowStyle Normal -WorkingDirectory $workspace -ArgumentList @('-NoExit', '-Command', 'pnpm --filter @workspace/api-server start')
Start-Process -FilePath 'powershell.exe' -WindowStyle Normal -WorkingDirectory $workspace -ArgumentList @('-NoExit', '-Command', 'pnpm --filter @workspace/islamic-book-bundle dev')
Write-Host 'Done. Wait until the API says "Server listening" and Vite shows the website address.'
