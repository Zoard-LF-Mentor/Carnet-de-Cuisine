$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$distribution = Join-Path $root "dist"
$archive = Join-Path $distribution "AtTable-Windows.zip"
$temporaryArchive = Join-Path $distribution ("AtTable-Windows-" + [guid]::NewGuid().ToString("N") + ".zip")
$previousArchive = "$temporaryArchive.previous"
$staging = Join-Path $env:TEMP ("AtTable-Windows-" + [guid]::NewGuid().ToString("N"))
$folders = @("Application", "Apparence", "Images")
$dataFolders = @("Recettes")
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

    $dataStaging = Join-Path $staging "Donnees"
    New-Item -ItemType Directory -Path $dataStaging | Out-Null
    foreach ($folder in $dataFolders) {
        Copy-Item -Path (Join-Path $root "Donnees\$folder") -Destination $dataStaging -Recurse
    }

    Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $temporaryArchive -CompressionLevel Optimal
    if (Test-Path $archive) {
        try {
            [System.IO.File]::Replace($temporaryArchive, $archive, $previousArchive)
            Remove-Item $previousArchive -Force
        }
        catch {
            $fallbackArchive = Join-Path $distribution ("AtTable-Windows-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".zip")
            [System.IO.File]::Move($temporaryArchive, $fallbackArchive)
            $archive = $fallbackArchive
            Write-Warning "L’archive existante est verrouillée; le nouveau paquet a été créé sous : $fallbackArchive"
        }
    }
    else {
        [System.IO.File]::Move($temporaryArchive, $archive)
    }

    Write-Host "Paquet créé : $archive"
}
finally {
    Remove-Item $staging -Recurse -Force
    if (Test-Path $temporaryArchive) {
        Remove-Item $temporaryArchive -Force
    }
    if (Test-Path $previousArchive) {
        Remove-Item $previousArchive -Force
    }
}