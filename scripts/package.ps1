# SnipKit — package for Chrome Web Store submission (Windows PowerShell)
Write-Host "Packaging SnipKit v1.0.0..." -ForegroundColor Cyan

# Clean / create dist
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
New-Item -ItemType Directory -Path "dist" | Out-Null

# Files and folders to include in the zip
$include = @(
  "manifest.json",
  "popup",
  "content",
  "background",
  "shared",
  "icons"
)

Compress-Archive -Force -Path $include -DestinationPath "dist\snipkit-v1.0.0.zip"

Write-Host "Done: dist\snipkit-v1.0.0.zip" -ForegroundColor Green
$item = Get-Item "dist\snipkit-v1.0.0.zip"
Write-Host ("Size: {0:N0} KB" -f ($item.Length / 1KB))
