Write-Host "🚀 Starting MindfulChat Sentiment Service..." -ForegroundColor Green
$sentimentJob = Start-Job -ScriptBlock {
    Push-Location "$using:PWD\sentiment_service"
    python app.py
    Pop-Location
}

$sentimentPort = "5001"
$envFilePath = "$PSScriptRoot/.env"

if (Test-Path $envFilePath) {
    try {
        $portLine = Get-Content $envFilePath | Select-String -Pattern '^SENTIMENT_SERVICE_PORT=' -SimpleMatch
        if ($portLine) {
            $sentimentPort = ($portLine.Line -split '=')[1].Trim()
            Write-Host "Found SENTIMENT_SERVICE_PORT in .env, using port $sentimentPort" -ForegroundColor Cyan
        } else {
            Write-Host "SENTIMENT_SERVICE_PORT not set in .env, using default 5001." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error reading .env file, falling back to default port 5001." -ForegroundColor Yellow
    }
} else {
    Write-Host ".env file not found, using default port 5001." -ForegroundColor Yellow
}

$serviceUrl = "http://localhost:$sentimentPort/healthz"
$maxRetries = 20
$serviceReady = $false

Write-Host "Waiting for sentiment service to be ready at $serviceUrl..." -ForegroundColor Yellow

for ($i = 1; $i -le $maxRetries; $i++) {
    if ($sentimentJob.State -ne 'Running') {
        Write-Host "❌ Sentiment service job failed to stay running. State: $($sentimentJob.State)" -ForegroundColor Red
        Receive-Job $sentimentJob
        break
    }
    
    try {
        $response = Invoke-WebRequest -Uri $serviceUrl -Method Get -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Sentiment service is ready!" -ForegroundColor Green
            $serviceReady = $true
            break
        }
    } catch {
        Write-Host "Waiting... ($i/$maxRetries)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 1
    }
}

if (-not $serviceReady) {
    Write-Host "❌ CRITICAL: Sentiment service did not start within $maxRetries seconds." -ForegroundColor Red
    Write-Host "Please check the 'sentiment_service' logs for errors."
    Stop-Job -Job $sentimentJob
    Remove-Job -Job $sentimentJob
    exit 1
}

Write-Host "`n🚀 Starting Node.js MindfulChat Backend..." -ForegroundColor Cyan

npm run dev

Write-Host "Shutting down background sentiment service job..."
Stop-Job -Job $sentimentJob
Remove-Job -Job $sentimentJob