-- =============================================================================
-- Research Agent — Google Maps candidates
-- Populated by the HappyRobot "Research Agent" workflow via
--   POST /api/research/agent/callback
-- =============================================================================

create table if not exists public.googlemaps_candidates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  agent_name      text,
  topic           text,
  place_name      text,
  phone_number    text,
  company_type    text,
  address         text,
  website         text,
  email           text,
  rating          numeric,
  review_count    int,
  hours           text,
  description     text,
  sales_notes     text,
  google_place_id text,
  raw             jsonb default '{}'
);

create index if not exists googlemaps_candidates_created_at_idx
  on public.googlemaps_candidates (created_at desc);
create index if not exists googlemaps_candidates_agent_name_idx
  on public.googlemaps_candidates (agent_name);
create index if not exists googlemaps_candidates_topic_idx
  on public.googlemaps_candidates (topic);

alter publication supabase_realtime add table public.googlemaps_candidates;
