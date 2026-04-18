# Triggers the HappyRobot v11 Multiply Call Agent for each lead in $leads.
# Uses the actual HR v2 trigger endpoint (NOT /hooks/{slug} which is the
# editor UI URL and just redirects to login).
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

# v2 trigger endpoint
$workflowId = "019da099-829f-70dd-8834-8a949e841f73"
$url = "https://platform.eu.happyrobot.ai/api/v2/workflows/$workflowId/runs"

$apiKey = $env:HR_API_KEY
if (-not $apiKey) { throw "HR_API_KEY missing in .env.local" }

# === Leads to call ===
$leads = @(
  @{
    lead_id          = "lead_david"
    phone_number     = "+491774890995"
    customer_name    = "David"
    company          = "TUM.ai"
    persona_role     = "Co-Lead"
    attendee_email   = "david@tum.ai"
    focus            = "Multiply demo on stage"
    hook             = "is hosting the HappyRobot x TUM.ai Makathon today"
    lead_timezone    = "Europe/Berlin"
    previous_outcome = ""
    agent_index      = 1
  },
  @{
    lead_id          = "lead_2"
    phone_number     = "+4915170846448"
    customer_name    = "Lead Zwei"
    company          = "TUM.ai"
    persona_role     = "Team Member"
    attendee_email   = ""
    focus            = "Multiply demo on stage"
    hook             = "is on the Multiply hackathon team"
    lead_timezone    = "Europe/Berlin"
    previous_outcome = ""
    agent_index      = 2
  }
)

Write-Host "Triggering $($leads.Count) HR run(s) at $url" -ForegroundColor Cyan

foreach ($lead in $leads) {
  $payload = $lead | ConvertTo-Json -Compress
  $tmp = New-TemporaryFile
  $payload | Out-File -Encoding ascii -NoNewline -FilePath $tmp.FullName

  Write-Host "`n  -> $($lead.customer_name) ($($lead.phone_number))" -ForegroundColor Yellow

  $resp = curl.exe -sS -w "`nHTTP_CODE:%{http_code}" -X POST `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $apiKey" `
    --data-binary "@$($tmp.FullName)" `
    $url

  Remove-Item $tmp.FullName -Force
  Write-Host $resp
}

Write-Host "`nWatch live: https://platform.eu.happyrobot.ai/tumaimultiply/workflows/hxdmn0lnm8zc/runs" -ForegroundColor Green
