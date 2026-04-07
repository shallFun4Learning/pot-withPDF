$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
    throw 'corepack is required (Node.js >= 18).'
}

corepack pnpm --version | Out-Null

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile "$env:TEMP\rustup-init.exe"
    & "$env:TEMP\rustup-init.exe" -y --profile minimal
    $env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
}

corepack pnpm install
corepack pnpm exec playwright install chromium
Write-Host 'Bootstrap complete.'
