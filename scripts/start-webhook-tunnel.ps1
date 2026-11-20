<#
.SYNOPSIS
    Ensures the Smee.io webhook relay container (chrono-cloud-webhook-relay) is
    running and syncs SMEE_URL from .env.jenkins.local to the GitHub repository webhook.
#>

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.jenkins.local"

if (-not (Test-Path $envFile)) {
    throw "Missing $envFile. Copy .env.jenkins.example to .env.jenkins.local first."
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $envVars[$Matches[1].Trim()] = $Matches[2].Trim()
    }
}

$owner   = if ($envVars["GITHUB_OWNER"]) { $envVars["GITHUB_OWNER"] } else { "AsfandAhmed3" }
$repo    = if ($envVars["GITHUB_REPO"])  { $envVars["GITHUB_REPO"] }  else { "chrono-cloud-devsecops-pipeline" }
$pat     = $envVars["GITHUB_PAT"]
$smeeUrl = $envVars["SMEE_URL"]

if (-not $smeeUrl) {
    $resp = Invoke-WebRequest "https://smee.io/new" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($resp.Headers["Location"]) {
        $smeeUrl = $resp.Headers["Location"]
        Add-Content -Path $envFile -Value "`nSMEE_URL=$smeeUrl"
    } else {
        throw "Could not determine SMEE_URL. Add SMEE_URL=https://smee.io/<channel> to .env.jenkins.local."
    }
}

Write-Host "Starting Jenkins & Smee.io Webhook Relay containers..." -ForegroundColor Cyan
Push-Location $repoRoot
try {
    docker compose -f docker-compose.jenkins.yml up -d
} finally {
    Pop-Location
}

if ($pat) {
    $headers = @{
        Authorization = "Bearer $pat"
        Accept        = "application/vnd.github+json"
    }
    $hooksApi = "https://api.github.com/repos/$owner/$repo/hooks"
    $hooks = Invoke-RestMethod -Uri $hooksApi -Headers $headers
    $payload = @{
        active = $true
        events = @("push")
        config = @{
            url          = $smeeUrl
            content_type = "json"
            insecure_ssl = "0"
        }
    } | ConvertTo-Json -Depth 4

    $existing = $hooks | Select-Object -First 1
    if ($existing) {
        Invoke-RestMethod -Uri "$hooksApi/$($existing.id)" -Method Patch -Headers $headers -ContentType "application/json" -Body $payload | Out-Null
        Write-Host "Updated GitHub Webhook #$($existing.id) -> $smeeUrl" -ForegroundColor Green
    } else {
        $createPayload = @{
            name   = "web"
            active = $true
            events = @("push")
            config = @{
                url          = $smeeUrl
                content_type = "json"
                insecure_ssl = "0"
            }
        } | ConvertTo-Json -Depth 4
        $created = Invoke-RestMethod -Uri $hooksApi -Method Post -Headers $headers -ContentType "application/json" -Body $createPayload
        Write-Host "Created GitHub Webhook #$($created.id) -> $smeeUrl" -ForegroundColor Green
    }
}

Write-Host "Webhook Relay Active: $smeeUrl -> http://chrono-cloud-jenkins:8080/github-webhook/" -ForegroundColor Cyan
