# Launch Local Scientific Qwen3.5 LLM server
$pythonExe = "C:\Users\user\AppData\Local\Programs\Python\Python310\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $scriptDir "serve-local-scientific-llm.py"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Starting Local Scientific LLM (Qwen3.5-9B Balanced 20-Step)    " -ForegroundColor Green
Write-Host "  Endpoint: http://127.0.0.1:8000/v1                             " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

& $pythonExe $serverScript $args
