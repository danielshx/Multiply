-- =============================================================================
-- RLS fix for /us-outreach — dashboard anon key needs read access.
-- Paste into Supabase SQL editor and run. Idempotent.
-- =============================================================================

alter table public.us_outreach_calls   disable row level security;
alter table public.us_outreach_messages disable row level security;
