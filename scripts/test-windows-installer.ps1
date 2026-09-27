$ErrorActionPreference = 'Stop'
$root = Join-Path $env:TEMP ([guid]::NewGuid().ToString())
$originalPath = $env:PATH
New-Item -ItemType Directory -Path $root | Out-Null
try {
  $env:BOTPAGER_VERSION = (Get-Content VERSION).Trim()
  $env:BOTPAGER_INSTALL_DIR = Join-Path $root 'install space'
  # Local HTTP fixture serves the exact built archive. Python is only a test-server dependency.
  Copy-Item -Recurse artifacts (Join-Path $root 'downloads')
  $server = Start-Process python -ArgumentList '-m','http.server','18763','--bind','127.0.0.1','--directory',"$root/downloads" -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 2
  $env:BOTPAGER_DOWNLOAD_BASE = 'http://127.0.0.1:18763'
  $env:PATH = "$env:SystemRoot\System32;$env:SystemRoot"
  & ./install.ps1
  & ./install.ps1
  $exe = Join-Path $env:BOTPAGER_INSTALL_DIR 'botpager.exe'
  if ((& $exe --version) -ne $env:BOTPAGER_VERSION) { throw 'Wrong installed version' }
  $before = (Get-FileHash $exe).Hash
  $archive = Get-ChildItem "$root/downloads/*.zip" | Select-Object -First 1
  Add-Content $archive.FullName 'corruption'
  $rejected = $false
  try { & ./install.ps1 } catch { $rejected = $true }
  if (!$rejected -or (Get-FileHash $exe).Hash -ne $before) { throw 'Corruption protection failed' }
  '{"passed":true,"nodeRequired":false,"checks":["repeat install","space in path","version","corruption rejected","existing binary preserved"]}' | Set-Content artifacts/installer-report.json
} finally {
  $env:PATH = $originalPath
  if ($server) { Stop-Process $server.Id -ErrorAction SilentlyContinue }
  Remove-Item -Recurse -Force $root
}
