# dialogue installer (Windows PowerShell)
# Usage:  irm https://raw.githubusercontent.com/RZX00/dialogue-skills/main/install.ps1 | iex
# Downloads the repository and runs install/sync.py, which installs the always-on rule, the three skills,
# the Codex AGENTS.md block and the Cursor copy, and moves the replaced socratic-* skills to ~/.claude/skills-retired/.
$ErrorActionPreference = "Stop"

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }
if (-not $python) { throw "Python is required: https://www.python.org/downloads/" }
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("dialogue-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $zip = Join-Path $tmp "repo.zip"
  Invoke-WebRequest -Uri "https://codeload.github.com/RZX00/dialogue-skills/zip/main" -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $tmp
  & $python.Source (Join-Path $tmp "dialogue-skills-main/install/sync.py") @args
  Write-Host "Done. Start a new Claude Code / Codex session to load the rule and skills."
} finally {
  Remove-Item -Recurse -Force $tmp
}
