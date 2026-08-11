param(
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host "[sync-github-issues] Verificando backend en $BaseUrl ..."
try {
    $loginBody = '{"email":"admin@helpdesk.com","password":"admin123"}'
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post `
        -ContentType "application/json" -Body $loginBody -TimeoutSec 10
    Write-Host "[sync-github-issues] Backend OK (usuario: $($login.nombre))"
} catch {
    Write-Error "[sync-github-issues] El backend no responde. Asegurate de que el stack este arriba (docker compose up --build) y reintenta."
    exit 1
}

Write-Host "[sync-github-issues] Ejecutando agente github-issues..."
opencode run --agent github-issues --auto `
    "Crea issues de GitHub para los incidentes de categoria SOFTWARE que esten pendientes."

if ($LASTEXITCODE -ne 0) {
    Write-Error "[sync-github-issues] opencode termino con error (codigo $LASTEXITCODE)."
    exit $LASTEXITCODE
}

Write-Host "[sync-github-issues] Listo."
