# Triggers the Multiply Mini Agent (max 5s / 1 sentence per turn).
# Workflow ID: 019da1b8-1af3-70fe-af69-3e24e327289c  (slug: ow7ufmoe7mws)
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

$workflowId = "019da1b8-1af3-70fe-af69-3e24e327289c"
# Staging — production trunk is currently broken in this HR org.
$environment = "staging"
$url = "https://platform.eu.happyrobot.ai/api/v2/workflows/$workflowId/runs"

$apiKey = $env:HR_API_KEY
if (-not $apiKey) { throw "HR_API_KEY missing in .env.local" }

# === Lead to call ===
# All six trigger fields (matches the Webhook · mini lead node).
$lead = @{
  name          = "David"
  company       = "TUM.ai"
  phone_number  = "+491774890995"
  email         = "david@tum.ai"
  current_time  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  customer_goal = "evaluate Multiply for outbound SDR scaling"
}

$body = @{ payload = $lead; environment = $environment } | ConvertTo-Json -Compress -Depth 5
$tmp = New-TemporaryFile
$body | Out-File -Encoding ascii -NoNewline -FilePath $tmp.FullName

Write-Host "Triggering Mini Agent ($environment) -> $($lead.name) ($($lead.phone_number))" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor DarkGray

  $resp = curl.exe -sS -w "`nHTTP_CODE:%{http_code}" -X POST `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $apiKey" `
    --data-binary "@$($tmp.FullName)" `
    $url

Remove-Item $tmp.FullName -Force
Write-Host $resp

Write-Host "`nWatch live: https://platform.eu.happyrobot.ai/tumaimultiply/workflow/ow7ufmoe7mws/runs" -ForegroundColor Green
