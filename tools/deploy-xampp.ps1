param([string]$Destination = 'C:\xampp\htdocs\benkhoos')
$ErrorActionPreference = 'Stop'
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$targetRoot = [System.IO.Path]::GetFullPath($Destination)
if ($targetRoot -eq $sourceRoot) { throw 'La carpeta de destino debe ser diferente del proyecto.' }
$backupRoot = Join-Path $sourceRoot ('archive/xampp-backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$files = @('.htaccess', 'index.html', 'benkhoos_the_game_el_palenque_de_la_matuna.html')
foreach ($folder in @('js', 'css', 'api', 'assets')) {
    $files += Get-ChildItem -LiteralPath (Join-Path $sourceRoot $folder) -File -Recurse | ForEach-Object {
        $_.FullName.Substring($sourceRoot.Length + 1)
    }
}
foreach ($relative in $files) {
    if ($relative -eq 'api\config.local.php' -or $relative -eq 'api/config.local.php') { continue }
    $sourceFile = Join-Path $sourceRoot $relative
    $targetFile = [System.IO.Path]::GetFullPath((Join-Path $targetRoot $relative))
    if (-not $targetFile.StartsWith($targetRoot.TrimEnd('\') + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Destino fuera de la carpeta autorizada.' }
    if (Test-Path -LiteralPath $targetFile) {
        if ((Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $targetFile -Algorithm SHA256).Hash) { continue }
        $backupFile = Join-Path $backupRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $backupFile) -Force | Out-Null
        Copy-Item -LiteralPath $targetFile -Destination $backupFile
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $targetFile) -Force | Out-Null
    Copy-Item -LiteralPath $sourceFile -Destination $targetFile -Force
}
Write-Output "Juego actualizado en $targetRoot. Respaldo: $backupRoot"
