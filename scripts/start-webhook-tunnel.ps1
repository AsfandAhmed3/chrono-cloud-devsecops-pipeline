<#
.SYNOPSIS
    Starts a free Cloudflare Quick Tunnel exposing local Jenkins (port 8080)
    so GitHub Webhooks can trigger automated post-merge deployments.
#>

Write-Host "Checking for cloudflared..." -ForegroundColor Cyan
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "cloudflared is not installed. Installing via winget..." -ForegroundColor Yellow
    winget install --id Cloudflare.cloudflared --accept-package-agreements --accept-source-agreements
}

Write-Host ""
Write-Host "Starting Cloudflare Tunnel to http://localhost:8080 ..." -ForegroundColor Green
Write-Host "Copy the https://<random>.trycloudflare.com URL below and set your GitHub Webhook Payload URL to:" -ForegroundColor Yellow
Write-Host "  https://<random>.trycloudflare.com/github-webhook/" -ForegroundColor White
Write-Host "Content type: application/json | Events: Just the push event" -ForegroundColor Gray
Write-Host ""

cloudflared tunnel --url http://localhost:8080
