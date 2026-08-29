param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$VenvPython = "$PSScriptRoot\..\.venv\Scripts\python.exe"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host "[sync-adjuntos] Verificando backend en $BaseUrl ..."
try {
    $loginBody = '{"email":"admin@helpdesk.com","password":"admin123"}'
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginBody -TimeoutSec 10
    Write-Host "[sync-adjuntos] Backend OK (usuario: $($login.nombre))"
} catch {
    Write-Error "[sync-adjuntos] El backend no responde. Asegurate de que el stack este arriba (docker compose up --build) y reintenta."
    exit 1
}

if (-not (Test-Path $VenvPython)) {
    Write-Error "[sync-adjuntos] No se encontro el python del venv en $VenvPython. Corri antes: py -3.11 -m venv .venv y pip install -r requirements.txt"
    exit 1
}

Write-Host "[sync-adjuntos] Ingiendo adjuntos de incidentes en chromadb..."
& $VenvPython "$RootDir\scripts\ingest_adjuntos.py" --backend-url $BaseUrl

if ($LASTEXITCODE -ne 0) {
    Write-Error "[sync-adjuntos] La ingesta termino con error (codigo $LASTEXITCODE)."
    exit $LASTEXITCODE
}

Write-Host "[sync-adjuntos] Listo."