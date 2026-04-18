# Triggers the Multiply Mini SMS Agent (1-sentence outbound from +498962824034).
# Workflow ID: 019da21f-9d7c-7457-96cb-53d1db972baf  (slug: xfuvzov9qnyn)
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

$workflowId = "019da21f-9d7c-7457-96cb-53d1db972baf"
# Staging — production trunk is currently broken in this HR org.
$environment = "staging"
$url = "https://platform.eu.happyrobot.ai/api/v2/workflows/$workflowId/runs"

$apiKey = $env:HR_API_KEY
if (-not $apiKey) { throw "HR_API_KEY missing in .env.local" }

# === Lead to SMS ===
$lead = @{
  name          = "David"
  company       = "TUM.ai"
  phone_number  = "+491774890995"
  email         = "davidfersing90@gmail.com"
  current_time  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
  customer_goal = "evaluate Multiply for outbound SDR scaling"
}

$body = @{ payload = $lead; environment = $environment } | ConvertTo-Json -Compress -Depth 5
$tmp = New-TemporaryFile
$body | Out-File -Encoding ascii -NoNewline -FilePath $tmp.FullName

Write-Host "Triggering Mini SMS Agent ($environment) -> $($lead.name) ($($lead.phone_number))" -ForegroundColor Cyan
Write-Host "From: +498962824034 (TUM.AI Multiply)" -ForegroundColor DarkGray
Write-Host "Body: $body" -ForegroundColor DarkGray

$resp = curl.exe -sS -w "`nHTTP_CODE:%{http_code}" -X POST `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $apiKey" `
  --data-binary "@$($tmp.FullName)" `
  $url

Remove-Item $tmp.FullName -Force
Write-Host $resp

Write-Host "`nWatch live: https://platform.eu.happyrobot.ai/tumaimultiply/workflow/xfuvzov9qnyn/runs" -ForegroundColor Green
