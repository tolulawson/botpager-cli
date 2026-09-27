$ErrorActionPreference = 'Stop'
if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -ne 'X64') { throw 'Only Windows x64 is currently supported.' }
$version = $env:BOTPAGER_VERSION
if (!$version) { $version = (Invoke-RestMethod 'https://api.github.com/repos/tolulawson/botpager-cli/releases/latest').tag_name.TrimStart('v') }
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'No valid stable release found' }
$base = $env:BOTPAGER_DOWNLOAD_BASE
if (!$base) { $base = "https://github.com/tolulawson/botpager-cli/releases/download/v$version" }
$asset = "botpager-$version-windows-x64.zip"
$dest = $env:BOTPAGER_INSTALL_DIR
if (!$dest) { $dest = Join-Path $env:LOCALAPPDATA 'BotPager\bin' }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$temp = Join-Path $dest ([guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $temp | Out-Null
try {
  Invoke-WebRequest "$base/$asset" -OutFile "$temp/archive.zip"
  Invoke-WebRequest "$base/SHA256SUMS" -OutFile "$temp/checksums"
  $lines = @(Get-Content "$temp/checksums" | Where-Object { ($_ -split '\s+')[1] -eq $asset })
  if ($lines.Count -ne 1) { throw 'Missing/ambiguous checksum' }
  $expected = ($lines[0] -split '\s+')[0]
  if ((Get-FileHash "$temp/archive.zip" -Algorithm SHA256).Hash -ne $expected) { throw 'Checksum mismatch' }
  Expand-Archive "$temp/archive.zip" -DestinationPath $temp
  $actual = & "$temp/botpager.exe" --version
  if ($LASTEXITCODE -ne 0 -or $actual -ne $version) { throw 'Binary failed version check' }
  Move-Item -Force "$temp/botpager.exe" "$dest/botpager.exe"
  Write-Host "Installed BotPager $version at $dest"
  Write-Host "Add $dest to PATH, then run botpager pair."
} finally { Remove-Item -Recurse -Force $temp }
