-- =============================================================================
-- /us-outreach — metrics + insights schema additions
-- Idempotent, safe to re-run.
-- =============================================================================

-- 1. Call-level timing + metrics columns --------------------------------------

alter table public.us_outreach_calls
  add column if not exists started_at          timestamptz,
  add column if not exists connected_at        timestamptz,
  add column if not exists ended_at            timestamptz,
  add column if not exists total_duration_sec  int,
  add column if not exists talk_duration_sec   int,
  add column if not exists language            text,
  add column if not exists country_code        text,
  add column if not exists objection_tags      text[],
  add column if not exists cost_usd            numeric(10, 4);

-- 2. Structured error log (all endpoints write here on failure) ---------------

create table if not exists public.us_outreach_logs (
  id        uuid primary key default gen_random_uuid(),
  ts        timestamptz default now(),
  level     text not null,          -- 'info' | 'warn' | 'error'
  source    text not null,          -- e.g. 'trigger', 'webhook', 'sync', 'tool:send_quiz_link'
  call_id   uuid references public.us_outreach_calls(id) on delete set null,
  event     text,                   -- short machine-readable key
  detail    jsonb default '{}'
);

create index if not exists us_outreach_logs_ts_idx
  on public.us_outreach_logs (ts desc);
create index if not exists us_outreach_logs_call_id_idx
  on public.us_outreach_logs (call_id);
create index if not exists us_outreach_logs_level_idx
  on public.us_outreach_logs (level);

alter table public.us_outreach_logs disable row level security;

do $$
begin
  alter publication supabase_realtime add table public.us_outreach_logs;
exception when duplicate_object then null;
end $$;

-- 3. Deduped view of HR events by payload id (for webhook idempotency) --------

create unique index if not exists hr_events_payload_id_uniq
  on public.hr_events ((payload->>'id'))
  where payload->>'id' is not null;
