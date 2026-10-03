$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$distribution = Join-Path $root "dist"
$archive = Join-Path $distribution "AtTable-Windows.zip"
$staging = Join-Path $env:TEMP ("AtTable-Windows-" + [guid]::NewGuid().ToString("N"))
$folders = @("Application", "Apparence", "Donnees", "Images")
$files = @("index.html", "apparence.css", "AtTable.exe", "GUIDE.md", "README.md")

& (Join-Path $root "build-windows.ps1")
New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path $distribution -Force | Out-Null

try {
    foreach ($file in $files) {
        Copy-Item -Path (Join-Path $root $file) -Destination $staging
    }

    foreach ($folder in $folders) {
        Copy-Item -Path (Join-Path $root $folder) -Destination $staging -Recurse
    }

    if (Test-Path $archive) {
        Remove-Item $archive -Force
    }

    Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $archive -CompressionLevel Optimal
    Write-Host "Paquet créé : $archive"
}
finally {
    Remove-Item $staging -Recurse -Force
}