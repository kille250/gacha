# OpenHotel Server Setup Script for Windows
# Run: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "OpenHotel Server Setup" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

$sourceDir = "..\openhotel-reference\app\server"
$targetDir = "."

# Check if source exists
if (-not (Test-Path $sourceDir)) {
    Write-Host "Error: OpenHotel reference not found at $sourceDir" -ForegroundColor Red
    Write-Host "Please clone OpenHotel first:" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/openhotel/openhotel.git openhotel-reference" -ForegroundColor White
    exit 1
}

Write-Host "Copying OpenHotel server files..." -ForegroundColor Yellow

# Copy main server files
$filesToCopy = @(
    "mod.ts",
    "deno.json",
    "deno.lock"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $sourceDir $file
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $targetDir -Force
        Write-Host "  Copied: $file" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (not found): $file" -ForegroundColor Gray
    }
}

# Copy directories
$dirsToCopy = @(
    "src",
    "shared"
)

foreach ($dir in $dirsToCopy) {
    $sourcePath = Join-Path $sourceDir $dir
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $targetDir -Recurse -Force
        Write-Host "  Copied: $dir\" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (not found): $dir\" -ForegroundColor Gray
    }
}

# Check for shared at root level too
$sharedRoot = "..\openhotel-reference\shared"
if ((Test-Path $sharedRoot) -and -not (Test-Path ".\shared")) {
    Copy-Item $sharedRoot $targetDir -Recurse -Force
    Write-Host "  Copied: shared\ (from root)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Uncomment openhotel-server in render.yaml" -ForegroundColor White
Write-Host "  2. Uncomment VITE_OPENHOTEL_* env vars in render.yaml" -ForegroundColor White
Write-Host "  3. Push to GitHub to deploy" -ForegroundColor White
