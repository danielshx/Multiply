# Triggers the Multiply Email Agent for a single lead.
# Workflow ID: 019da1ed-4f91-74ae-a195-84a6ba8e5e23  (slug: mvkkk7huh5do)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root ".env.local"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $name = $line.Substring(0, $i).Trim()
    $val = $line.Substring($i + 1).Trim()
    Set-Item -Path "env:$name" -Value $val
  }
}

$workflowId = "019da1ed-4f91-74ae-a195-84a6ba8e5e23"
$url = "https://platform.eu.happyrobot.ai/api/v2/workflows/$workflowId/runs"

$apiKey = $env:HR_API_KEY
if (-not $apiKey) { throw "HR_API_KEY missing in .env.local" }

# === Lead to email ===
# All seven trigger fields (matches the Webhook · email lead node).
$lead = @{
  name          = "David"
  company       = "TUM.ai"
  phone_number  = "+491774890995"
  email         = "davidfersing90@gmail.com"
  current_time  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  customer_goal = "AI-Workshop fuer 12 Engineers im Q2"
  time_zone     = "Europe/Berlin"
}

$payload = $lead | ConvertTo-Json -Compress
$tmp = New-TemporaryFile
$payload | Out-File -Encoding ascii -NoNewline -FilePath $tmp.FullName

Write-Host "Triggering Email Agent -> $($lead.name) ($($lead.email))" -ForegroundColor Cyan
Write-Host "Payload: $payload" -ForegroundColor DarkGray

$resp = curl.exe -sS -w "`nHTTP_CODE:%{http_code}" -X POST `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $apiKey" `
  --data-binary "@$($tmp.FullName)" `
  $url

Remove-Item $tmp.FullName -Force
Write-Host $resp

Write-Host "`nWatch live: https://platform.eu.happyrobot.ai/tumaimultiply/workflow/mvkkk7huh5do/runs" -ForegroundColor Green
