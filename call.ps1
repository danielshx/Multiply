# Loads Multiply/.env.local and fires the HappyRobot v11 workflow hook
# for each lead in the $leads array (one HR run per lead, in parallel).
# Uses curl.exe instead of Invoke-RestMethod because PowerShell strips the
# Authorization header on 3xx redirects and ends up in a redirect loop.
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

$hooksUrl = $env:HR_HOOKS_URL
if (-not $hooksUrl) { $hooksUrl = "https://platform.eu.happyrobot.ai/hooks" }

# v11 workflow slug (Multiply Call Agent · Senior Closer)
$slug = "hxdmn0lnm8zc"
if ($env:HR_WORKFLOW_SLUG -and $env:HR_WORKFLOW_SLUG -notmatch '^[0-9a-f]{8}-') {
  $slug = $env:HR_WORKFLOW_SLUG
}

$url = "$($hooksUrl.TrimEnd('/'))/$slug"

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

$apiKey = $env:HR_API_KEY

$jobs = foreach ($lead in $leads) {
  $body = $lead | ConvertTo-Json -Compress
  Write-Host "  -> $($lead.customer_name) ($($lead.phone_number))" -ForegroundColor Yellow

  Start-Job -ArgumentList $url, $apiKey, $body, $lead.customer_name -ScriptBlock {
    param($u, $k, $b, $name)
    $args = @(
      "-sS",
      "--max-time", "30",
      "-L",
      "-X", "POST",
      "-H", "Content-Type: application/json"
    )
    if ($k) { $args += @("-H", "Authorization: Bearer $k") }
    $args += @("-d", $b, $u)

    try {
      $resp = & curl.exe @args 2>&1
      [pscustomobject]@{ lead = $name; ok = $LASTEXITCODE -eq 0; response = $resp }
    } catch {
      [pscustomobject]@{ lead = $name; ok = $false; error = $_.Exception.Message }
    }
  }
}

$jobs | Wait-Job | Receive-Job | ConvertTo-Json -Depth 4
$jobs | Remove-Job
